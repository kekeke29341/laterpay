import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import EthereumProvider from '@walletconnect/ethereum-provider'

const LATER_PAY_ABI = [
  "function executePayment(address user, uint256 approvalId)",
  "function getUserApproval(address user, uint256 approvalId) view returns (tuple(address user, uint256 amount, uint256 approvedAt, uint256 dueDate, bool executed, uint256 executionAttempts))",
  "function userApprovalCount(address) view returns (uint256)",
  "function admins(address) view returns (bool)",
  "function paymentToken() view returns (address)",
  "function getContractBalance() view returns (uint256)",
  "function canExecutePayment(address user, uint256 approvalId) view returns (bool canExecute, string reason)",
  "function addAdmin(address admin)",
  "function removeAdmin(address admin)",
  "function owner() view returns (address)",
  "function emergencyWithdrawApproval(address user, uint256 approvalId)",
]

const TEST_USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
]

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

function AdminPage({ 
  provider: parentProvider, 
  signer: parentSigner, 
  account: parentAccount, 
  laterPay: parentLaterPay, 
  testUSDT: parentTestUSDT, 
  isAdmin: parentIsAdmin, 
  isOwner: parentIsOwner, 
  onDisconnect: parentOnDisconnect,
  walletConnectProvider: parentWalletConnectProvider,
  walletType: parentWalletType,
  onConnectMetaMask,
  onConnectWalletConnect
}) {
  const navigate = useNavigate()
  
  // ローカル状態（親から渡されない場合は自分で管理）
  const [provider, setProvider] = useState(parentProvider)
  const [signer, setSigner] = useState(parentSigner)
  const [account, setAccount] = useState(parentAccount)
  const [laterPay, setLaterPay] = useState(parentLaterPay)
  const [testUSDT, setTestUSDT] = useState(parentTestUSDT)
  const [isAdmin, setIsAdmin] = useState(parentIsAdmin || false)
  const [isOwner, setIsOwner] = useState(parentIsOwner || false)
  const [walletType, setWalletType] = useState(parentWalletType || null)
  const [walletConnectProvider, setWalletConnectProvider] = useState(parentWalletConnectProvider || null)
  
  const [testUSDTAddress, setTestUSDTAddress] = useState(() => {
    const stored = localStorage.getItem('testUSDTAddress')
    return stored || import.meta.env.VITE_TEST_USDT_ADDRESS || ''
  })
  const [laterPayAddress, setLaterPayAddress] = useState(() => {
    const stored = localStorage.getItem('laterPayAddress')
    return stored || import.meta.env.VITE_LATER_PAY_ADDRESS || ''
  })
  
  const [contractInfo, setContractInfo] = useState({
    owner: '',
    paymentToken: '',
    contractBalance: '0'
  })
  const [newAdminAddress, setNewAdminAddress] = useState('')
  const [adminToRemove, setAdminToRemove] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    // コントラクトアドレスが設定されていない場合は設定タブを表示
    const storedTestUSDT = localStorage.getItem('testUSDTAddress')
    const storedLaterPay = localStorage.getItem('laterPayAddress')
    const envTestUSDT = import.meta.env.VITE_TEST_USDT_ADDRESS || ''
    const envLaterPay = import.meta.env.VITE_LATER_PAY_ADDRESS || ''
    
    if (!storedTestUSDT && !envTestUSDT && !storedLaterPay && !envLaterPay) {
      return 'settings'
    }
    return 'execute'
  })
  
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedApprovalId, setSelectedApprovalId] = useState('')
  const [searchUser, setSearchUser] = useState('')
  const [searchedApprovals, setSearchedApprovals] = useState([])
  
  const [status, setStatus] = useState({ type: '', message: '' })

  // 親からWalletConnectプロバイダーが渡された場合はそれを使用
  useEffect(() => {
    if (parentWalletConnectProvider) {
      setWalletConnectProvider(parentWalletConnectProvider)
    }
  }, [parentWalletConnectProvider])

  // 親からpropsが更新された場合にローカル状態を更新
  useEffect(() => {
    if (parentProvider !== undefined) setProvider(parentProvider)
    if (parentSigner !== undefined) setSigner(parentSigner)
    if (parentAccount !== undefined) setAccount(parentAccount)
    if (parentLaterPay !== undefined) setLaterPay(parentLaterPay)
    if (parentTestUSDT !== undefined) setTestUSDT(parentTestUSDT)
    if (parentIsAdmin !== undefined) setIsAdmin(parentIsAdmin)
    if (parentIsOwner !== undefined) setIsOwner(parentIsOwner)
    if (parentWalletType !== undefined) setWalletType(parentWalletType)
  }, [parentProvider, parentSigner, parentAccount, parentLaterPay, parentTestUSDT, parentIsAdmin, parentIsOwner, parentWalletType])

  useEffect(() => {
    if (account && laterPay && testUSDT) {
      loadAdminInfo()
      checkAdminStatus()
    }
  }, [account, laterPay, testUSDT])

  const checkAdminStatus = async () => {
    try {
      if (!laterPay || !account) return
      const adminStatus = await laterPay.admins(account)
      const ownerAddress = await laterPay.owner()
      setIsAdmin(adminStatus)
      setIsOwner(account.toLowerCase() === ownerAddress.toLowerCase())
    } catch (error) {
      console.error('管理者チェックエラー:', error)
    }
  }

  const connectMetaMask = async () => {
    if (onConnectMetaMask) {
      // 親コンポーネントの関数を使用
      try {
        await onConnectMetaMask()
        // 親の状態が更新されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 1000))
        // ページをリロードして状態を同期
        window.location.reload()
      } catch (error) {
        setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
      }
      return
    } else {
      try {
        if (!window.ethereum) {
          setStatus({ type: 'error', message: 'MetaMaskがインストールされていません' })
          return
        }

        const newProvider = new ethers.BrowserProvider(window.ethereum)
        await newProvider.send("eth_requestAccounts", [])
        const newSigner = await newProvider.getSigner()
        const address = await newSigner.getAddress()

        setProvider(newProvider)
        setSigner(newSigner)
        setAccount(address)
        setWalletType('metamask')

        // コントラクトアドレスが設定されている場合のみ、コントラクトインスタンスを作成
        if (testUSDTAddress && laterPayAddress) {
          const testUSDTContract = new ethers.Contract(testUSDTAddress, TEST_USDT_ABI, newSigner)
          const laterPayContract = new ethers.Contract(laterPayAddress, LATER_PAY_ABI, newSigner)

          setTestUSDT(testUSDTContract)
          setLaterPay(laterPayContract)

          await checkAdminStatus()
          setStatus({ type: 'success', message: 'MetaMaskに接続しました' })
        } else {
          setTestUSDT(null)
          setLaterPay(null)
          setIsAdmin(false)
          setIsOwner(false)
          setStatus({ type: 'warning', message: 'ウォレットに接続しました。設定タブでコントラクトアドレスを設定してください。' })
        }
      } catch (error) {
        setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
      }
    }
  }

  const handleWalletConnectConnect = async () => {
    if (onConnectWalletConnect) {
      // 親コンポーネントの関数を使用
      try {
        await onConnectWalletConnect()
        // 親の状態が更新されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 1000))
        // ページをリロードして状態を同期
        window.location.reload()
      } catch (error) {
        if (error.message !== 'User rejected the request') {
          setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
        }
      }
      return
    } else {
      try {
        if (!walletConnectProvider) {
          setStatus({ type: 'error', message: 'WalletConnectが初期化されていません' })
          return
        }

        await walletConnectProvider.connect()

        const ethersProvider = new ethers.BrowserProvider(walletConnectProvider)
        const newSigner = await ethersProvider.getSigner()
        const address = await newSigner.getAddress()

        setProvider(ethersProvider)
        setSigner(newSigner)
        setAccount(address)
        setWalletType('walletconnect')

        // コントラクトアドレスが設定されている場合のみ、コントラクトインスタンスを作成
        if (testUSDTAddress && laterPayAddress) {
          const testUSDTContract = new ethers.Contract(testUSDTAddress, TEST_USDT_ABI, newSigner)
          const laterPayContract = new ethers.Contract(laterPayAddress, LATER_PAY_ABI, newSigner)

          setTestUSDT(testUSDTContract)
          setLaterPay(laterPayContract)

          await checkAdminStatus()
          setStatus({ type: 'success', message: 'WalletConnectに接続しました' })
        } else {
          setTestUSDT(null)
          setLaterPay(null)
          setIsAdmin(false)
          setIsOwner(false)
          setStatus({ type: 'warning', message: 'ウォレットに接続しました。設定タブでコントラクトアドレスを設定してください。' })
        }
      } catch (error) {
        if (error.message !== 'User rejected the request') {
          setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
        }
      }
    }
  }

  const disconnectWallet = async () => {
    try {
      if (walletType === 'walletconnect' && walletConnectProvider) {
        await walletConnectProvider.disconnect()
      } else {
        setProvider(null)
        setSigner(null)
        setAccount(null)
        setTestUSDT(null)
        setLaterPay(null)
        setIsAdmin(false)
        setIsOwner(false)
        setWalletType(null)
      }
      if (parentOnDisconnect) {
        parentOnDisconnect()
      }
      setStatus({ type: 'info', message: 'ウォレットが切断されました' })
    } catch (error) {
      setStatus({ type: 'error', message: `切断エラー: ${error.message}` })
    }
  }

  const loadAdminInfo = async () => {
    try {
      if (!laterPay || !testUSDT) return

      const owner = await laterPay.owner()
      const paymentToken = await laterPay.paymentToken()
      const contractBal = await laterPay.getContractBalance()
      const decimals = await testUSDT.decimals()

      setContractInfo({
        owner,
        paymentToken,
        contractBalance: ethers.formatUnits(contractBal, decimals)
      })
    } catch (error) {
      console.error('管理者情報読み込みエラー:', error)
    }
  }

  const handleSaveSettings = async () => {
    localStorage.setItem('testUSDTAddress', testUSDTAddress)
    localStorage.setItem('laterPayAddress', laterPayAddress)
    
    // ウォレットが接続されている場合、コントラクトインスタンスを再作成
    if (account && signer && testUSDTAddress && laterPayAddress) {
      try {
        const testUSDTContract = new ethers.Contract(testUSDTAddress, TEST_USDT_ABI, signer)
        const laterPayContract = new ethers.Contract(laterPayAddress, LATER_PAY_ABI, signer)

        setTestUSDT(testUSDTContract)
        setLaterPay(laterPayContract)

        await checkAdminStatus()
        await loadAdminInfo()
        setStatus({ type: 'success', message: '設定を保存し、コントラクトに接続しました。' })
      } catch (error) {
        setStatus({ type: 'error', message: `設定は保存されましたが、コントラクト接続エラー: ${error.message}` })
      }
    } else {
      setStatus({ type: 'success', message: '設定を保存しました。ウォレットを接続してください。' })
    }
  }

  const handleAddAdmin = async () => {
    try {
      if (!isOwner && !laterPay) {
        setStatus({ type: 'error', message: 'コントラクトに接続されていません' })
        return
      }

      if (!ethers.isAddress(newAdminAddress)) {
        setStatus({ type: 'error', message: '有効なアドレスを入力してください' })
        return
      }

      setStatus({ type: 'info', message: '管理者を追加中...' })
      const tx = await laterPay.addAdmin(newAdminAddress)
      await tx.wait()

      setStatus({ type: 'success', message: '管理者を追加しました' })
      setNewAdminAddress('')
      await loadAdminInfo()
      await checkAdminStatus()
    } catch (error) {
      setStatus({ type: 'error', message: `エラー: ${error.message}` })
    }
  }

  const handleRemoveAdmin = async () => {
    try {
      if (!isOwner && !laterPay) {
        setStatus({ type: 'error', message: 'コントラクトに接続されていません' })
        return
      }

      if (!ethers.isAddress(adminToRemove)) {
        setStatus({ type: 'error', message: '有効なアドレスを入力してください' })
        return
      }

      setStatus({ type: 'info', message: '管理者を削除中...' })
      const tx = await laterPay.removeAdmin(adminToRemove)
      await tx.wait()

      setStatus({ type: 'success', message: '管理者を削除しました' })
      setAdminToRemove('')
      await loadAdminInfo()
      await checkAdminStatus()
    } catch (error) {
      setStatus({ type: 'error', message: `エラー: ${error.message}` })
    }
  }

  const handleSearchUser = async () => {
    try {
      if (!searchUser || !ethers.isAddress(searchUser)) {
        setStatus({ type: 'error', message: '有効なアドレスを入力してください' })
        return
      }

      if (!laterPay || !testUSDT) {
        setStatus({ type: 'error', message: 'コントラクトに接続されていません' })
        return
      }

      const count = await laterPay.userApprovalCount(searchUser)
      const userApprovals = []
      const decimals = await testUSDT.decimals()
      
      for (let i = 0; i < count; i++) {
        const approval = await laterPay.getUserApproval(searchUser, i)
        const canExecuteResult = await laterPay.canExecutePayment(searchUser, i)
        
        userApprovals.push({
          id: i,
          ...approval,
          amount: ethers.formatUnits(approval.amount, decimals),
          approvedAt: new Date(Number(approval.approvedAt) * 1000).toLocaleString('ja-JP'),
          dueDate: new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP'),
          dueDateTimestamp: Number(approval.dueDate),
          canExecute: canExecuteResult[0],
          canExecuteReason: canExecuteResult[1],
        })
      }
      
      setSearchedApprovals(userApprovals)
      setStatus({ type: 'success', message: `${userApprovals.length}件の承認が見つかりました` })
    } catch (error) {
      setStatus({ type: 'error', message: `検索エラー: ${error.message}` })
    }
  }

  const handleExecute = async (userAddress, approvalId) => {
    try {
      if (!laterPay) {
        setStatus({ type: 'error', message: 'コントラクトに接続されていません' })
        return
      }

      setStatus({ type: 'info', message: '引き落とし処理中...' })
      const tx = await laterPay.executePayment(userAddress, approvalId)
      await tx.wait()

      setStatus({ type: 'success', message: '引き落としが完了しました！' })
      setSelectedUser('')
      setSelectedApprovalId('')
      if (searchUser) {
        await handleSearchUser()
      }
    } catch (error) {
      setStatus({ type: 'error', message: `エラー: ${error.message}` })
    }
  }

  const handleEmergencyWithdraw = async () => {
    try {
      if (!laterPay) {
        setStatus({ type: 'error', message: 'コントラクトに接続されていません' })
        return
      }

      if (!selectedUser || selectedApprovalId === '') {
        setStatus({ type: 'error', message: 'ユーザーと承認IDを入力してください' })
        return
      }

      setStatus({ type: 'info', message: '緊急引き落とし処理中...' })
      const tx = await laterPay.emergencyWithdrawApproval(selectedUser, parseInt(selectedApprovalId))
      await tx.wait()

      setStatus({ type: 'success', message: '緊急引き落としが完了しました！' })
      setSelectedUser('')
      setSelectedApprovalId('')
    } catch (error) {
      setStatus({ type: 'error', message: `エラー: ${error.message}` })
    }
  }

  if (!account) {
    return (
      <div className="container">
        <div className="card">
          <h2>管理者ページ</h2>
          <p>管理者ページにアクセスするには、ウォレットを接続してください。</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
            <button onClick={connectMetaMask} className="wallet-button metamask">
              MetaMaskに接続
            </button>
            {WALLETCONNECT_PROJECT_ID && (
              <button onClick={handleWalletConnectConnect} className="wallet-button walletconnect">
                WalletConnectで接続
              </button>
            )}
          </div>
          <button onClick={() => navigate('/')} style={{ marginTop: '20px' }}>トップページに戻る</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>管理者ページ</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/')}>トップページ</button>
          <button onClick={disconnectWallet} className="disconnect-button">切断</button>
        </div>
      </div>

      <div className="card">
        <h2>アカウント情報</h2>
        <p className="address">アドレス: {account}</p>
        {walletType && <p className="wallet-type">接続方法: {walletType === 'metamask' ? 'MetaMask' : 'WalletConnect'}</p>}
        {isOwner && <p style={{ color: '#ff6b6b', fontWeight: 'bold', marginTop: '10px' }}>🔑 オーナー</p>}
        {isAdmin && !isOwner && <p style={{ color: '#764ba2', fontWeight: 'bold', marginTop: '10px' }}>👤 管理者</p>}
        {!isAdmin && !isOwner && laterPay && (
          <p style={{ color: '#856404', fontWeight: 'bold', marginTop: '10px' }}>
            ⚠️ 管理者権限がありません。設定タブでコントラクトアドレスを確認してください。
          </p>
        )}
      </div>

      <div className="card admin-section">
        {/* タブナビゲーション */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'execute' ? 'active' : ''}`}
            onClick={() => setActiveTab('execute')}
          >
            引き落とし実行
          </button>
          <button 
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            設定
          </button>
          <button 
            className={`admin-tab ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            管理者管理 {isOwner ? '(オーナーのみ)' : ''}
          </button>
          <button 
            className={`admin-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            コントラクト情報
          </button>
        </div>

        {/* 引き落とし実行タブ */}
        {activeTab === 'execute' && (
          <div>
            <h3>引き落とし実行</h3>
            {!laterPay || !testUSDT ? (
              <p style={{ color: '#856404', marginBottom: '20px' }}>
                コントラクトに接続されていません。設定タブでコントラクトアドレスを設定してください。
              </p>
            ) : (
              <>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  任意のタイミングで、お客さんの口座から引き落としを実行できます。
                </p>
              
                <div style={{ marginBottom: '20px' }}>
                  <label>
                    ユーザー検索:
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        placeholder="0x..."
                        style={{ flex: 1 }}
                      />
                      <button onClick={handleSearchUser}>検索</button>
                    </div>
                  </label>
                </div>

                {searchedApprovals.length > 0 && (
                  <div className="approval-list" style={{ marginBottom: '20px' }}>
                    <h3>検索結果: {searchUser}</h3>
                    {searchedApprovals.map((approval) => {
                      const canExecute = approval.canExecute && !approval.executed
                      return (
                        <div key={approval.id} className={`approval-item ${approval.executed ? 'executed' : ''}`}>
                          <p><strong>承認ID:</strong> {approval.id}</p>
                          <p><strong>金額:</strong> {approval.amount} tUSDT</p>
                          <p><strong>承認日時:</strong> {approval.approvedAt}</p>
                          <p><strong>引き落とし日:</strong> {approval.dueDate}</p>
                          <p><strong>状態:</strong> {
                            approval.executed 
                              ? '✅ 実行済み' 
                              : canExecute 
                                ? '✅ 実行可能' 
                                : `⏳ 待機中${approval.canExecuteReason ? ` (${approval.canExecuteReason})` : ''}`
                          }</p>
                          {canExecute && (
                            <button 
                              onClick={() => handleExecute(searchUser, approval.id)}
                              className="execute-button"
                              style={{ marginTop: '10px' }}
                            >
                              引き落としを実行
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '10px' }}>手動引き落とし</h3>
                  <label>
                    ユーザーアドレス:
                    <input
                      type="text"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      placeholder="0x..."
                    />
                  </label>
                  <label>
                    承認ID:
                    <input
                      type="number"
                      value={selectedApprovalId}
                      onChange={(e) => setSelectedApprovalId(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <button 
                    onClick={() => handleExecute(selectedUser, parseInt(selectedApprovalId))}
                    disabled={!selectedUser || selectedApprovalId === ''}
                  >
                    引き落としを実行
                  </button>
                  <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                    注意: 引き落とし日が過ぎている承認のみ実行できます
                  </p>
                </div>

                {isOwner && (
                  <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                    <h3 style={{ marginBottom: '10px', color: '#856404' }}>緊急引き落とし（オーナーのみ）</h3>
                    <p style={{ marginBottom: '10px', fontSize: '0.9em', color: '#856404' }}>
                      通常の引き落としが失敗した場合に使用します。引き落とし日の制限なしで実行できます。
                    </p>
                    <label>
                      ユーザーアドレス:
                      <input
                        type="text"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        placeholder="0x..."
                      />
                    </label>
                    <label>
                      承認ID:
                      <input
                        type="number"
                        value={selectedApprovalId}
                        onChange={(e) => setSelectedApprovalId(e.target.value)}
                        placeholder="0"
                      />
                    </label>
                    <button 
                      onClick={handleEmergencyWithdraw}
                      disabled={!selectedUser || selectedApprovalId === ''}
                      style={{ background: '#ffc107', color: '#000' }}
                    >
                      緊急引き落としを実行
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div>
            <h3>システム設定</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              コントラクトアドレスを設定します。設定はブラウザのローカルストレージに保存されます。
            </p>
            
            <label>
              TestUSDT コントラクトアドレス:
              <input
                type="text"
                value={testUSDTAddress}
                onChange={(e) => setTestUSDTAddress(e.target.value)}
                placeholder="0x..."
              />
            </label>
            
            <label>
              LaterPay コントラクトアドレス:
              <input
                type="text"
                value={laterPayAddress}
                onChange={(e) => setLaterPayAddress(e.target.value)}
                placeholder="0x..."
              />
            </label>
            
            <button onClick={handleSaveSettings} className="approve-button">
              設定を保存
            </button>
            
            <p style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
              <strong>注意:</strong> 設定を保存すると、ウォレットが接続されている場合は自動的にコントラクトに接続されます。
            </p>
          </div>
        )}

        {/* 管理者管理タブ */}
        {activeTab === 'admins' && (
          <div>
            <h3>管理者管理</h3>
            {!laterPay ? (
              <p style={{ color: '#856404' }}>
                コントラクトに接続されていません。設定タブでコントラクトアドレスを設定してください。
              </p>
            ) : !isOwner ? (
              <p style={{ color: '#856404' }}>
                オーナー権限が必要です。現在のアカウントはオーナーではありません。
              </p>
            ) : (
              <>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  管理者を追加・削除できます。オーナーのみが実行可能です。
                </p>
                
                <div style={{ marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px' }}>管理者を追加</h4>
                  <label>
                    管理者アドレス:
                    <input
                      type="text"
                      value={newAdminAddress}
                      onChange={(e) => setNewAdminAddress(e.target.value)}
                      placeholder="0x..."
                    />
                  </label>
                  <button onClick={handleAddAdmin} className="approve-button">
                    管理者を追加
                  </button>
                </div>
                
                <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px' }}>管理者を削除</h4>
                  <label>
                    管理者アドレス:
                    <input
                      type="text"
                      value={adminToRemove}
                      onChange={(e) => setAdminToRemove(e.target.value)}
                      placeholder="0x..."
                    />
                  </label>
                  <button onClick={handleRemoveAdmin} className="execute-button">
                    管理者を削除
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* コントラクト情報タブ */}
        {activeTab === 'info' && (
          <div>
            <h3>コントラクト情報</h3>
            {!laterPay || !testUSDT ? (
              <p style={{ color: '#856404' }}>
                コントラクトに接続されていません。設定タブでコントラクトアドレスを設定してください。
              </p>
            ) : (
              <>
                <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <p><strong>オーナーアドレス:</strong> <span className="address">{contractInfo.owner || '読み込み中...'}</span></p>
                  <p style={{ marginTop: '10px' }}><strong>支払いトークンアドレス:</strong> <span className="address">{contractInfo.paymentToken || '読み込み中...'}</span></p>
                  <p style={{ marginTop: '10px' }}><strong>コントラクト残高:</strong> {contractInfo.contractBalance} tUSDT</p>
                  <p style={{ marginTop: '10px' }}><strong>現在のアカウント:</strong> <span className="address">{account}</span></p>
                  <p style={{ marginTop: '10px' }}>
                    <strong>権限:</strong> {
                      isOwner ? 'オーナー' : isAdmin ? '管理者' : '一般ユーザー'
                    }
                  </p>
                </div>
                
                <button onClick={loadAdminInfo} style={{ marginTop: '15px' }}>
                  情報を更新
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {status.message && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  )
}

export default AdminPage

