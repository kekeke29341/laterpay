import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import EthereumProvider from '@walletconnect/ethereum-provider'
import './index.css'

// ローカルストレージから設定を読み込む
const getStoredAddress = (key, envKey) => {
  const stored = localStorage.getItem(key)
  if (stored) return stored
  return import.meta.env[envKey] || ''
}

// コントラクトアドレス（環境変数またはローカルストレージから取得）
const getInitialTestUSDTAddress = () => getStoredAddress('testUSDTAddress', 'VITE_TEST_USDT_ADDRESS')
const getInitialLaterPayAddress = () => getStoredAddress('laterPayAddress', 'VITE_LATER_PAY_ADDRESS')

// WalletConnect Project ID（https://cloud.reown.com/ で取得）
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

// ABI
const TEST_USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
]

const LATER_PAY_ABI = [
  "function approvePayment(uint256 amount, uint256 dueDate)",
  "function executePayment(address user, uint256 approvalId)",
  "function getUserApproval(address user, uint256 approvalId) view returns (tuple(address user, uint256 amount, uint256 approvedAt, uint256 dueDate, bool executed, uint256 executionAttempts))",
  "function getUserApprovals(address user) view returns (tuple(address user, uint256 amount, uint256 approvedAt, uint256 dueDate, bool executed, uint256 executionAttempts)[])",
  "function userApprovalCount(address) view returns (uint256)",
  "function admins(address) view returns (bool)",
  "function paymentToken() view returns (address)",
  "function getContractBalance() view returns (uint256)",
  "function canExecutePayment(address user, uint256 approvalId) view returns (bool canExecute, string reason)",
  "function addAdmin(address admin)",
  "function removeAdmin(address admin)",
  "function owner() view returns (address)",
  "function emergencyWithdrawApproval(address user, uint256 approvalId)",
  "event PaymentApproved(address indexed user, uint256 indexed approvalId, uint256 amount, uint256 dueDate)",
  "event PaymentExecuted(address indexed user, uint256 indexed approvalId, uint256 amount, uint256 executedAt)",
  "event AdminAdded(address indexed admin)",
  "event AdminRemoved(address indexed admin)",
]

function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [testUSDT, setTestUSDT] = useState(null)
  const [laterPay, setLaterPay] = useState(null)
  const [balance, setBalance] = useState('0')
  const [allowance, setAllowance] = useState('0')
  const [contractBalance, setContractBalance] = useState('0')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [approvals, setApprovals] = useState([])
  const [walletType, setWalletType] = useState(null) // 'metamask' or 'walletconnect'
  const [walletConnectProvider, setWalletConnectProvider] = useState(null)
  
  // コントラクトアドレス（ローカルストレージ対応）
  const [testUSDTAddress, setTestUSDTAddress] = useState(getInitialTestUSDTAddress)
  const [laterPayAddress, setLaterPayAddress] = useState(getInitialLaterPayAddress)
  
  
  // Form states
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  
  const [status, setStatus] = useState({ type: '', message: '' })

  // WalletConnectプロバイダーの初期化
  useEffect(() => {
    const initWalletConnect = async () => {
      if (!WALLETCONNECT_PROJECT_ID) {
        console.warn('WalletConnect Project IDが設定されていません')
        return
      }

      try {
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          chains: [56], // BSC Mainnetをデフォルトチェーンに
          optionalChains: [1, 11155111, 97], // その他のチェーンはオプション
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'light',
            themeVariables: {
              '--w3m-z-index': '9999'
            },
            enableExplorer: false, // APIエラーを回避するためオフライン動作に
            explorerRecommendedWalletIds: undefined,
            explorerExcludedWalletIds: undefined,
            enableAccountView: true,
            enableNetworkView: true,
          },
          metadata: {
            name: 'Later Pay',
            description: '後払い決済システム',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
          rpcMap: {
            1: 'https://eth.llamarpc.com',
            11155111: 'https://rpc.sepolia.org',
            56: 'https://bsc-dataseed1.binance.org/',
            97: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
          },
        })

        setWalletConnectProvider(provider)

        // 既存のセッションを復元
        if (provider.session) {
          await handleWalletConnectConnect()
        }

        // イベントリスナー
        provider.on('disconnect', () => {
          setProvider(null)
          setSigner(null)
          setAccount(null)
          setWalletType(null)
          setStatus({ type: 'info', message: 'ウォレットが切断されました' })
        })
      } catch (error) {
        console.error('WalletConnect初期化エラー:', error)
      }
    }

    initWalletConnect()

    return () => {
      if (walletConnectProvider && typeof walletConnectProvider.removeAllListeners === 'function') {
        walletConnectProvider.removeAllListeners()
      } else if (walletConnectProvider && walletConnectProvider.off) {
        // 個別にリスナーを削除
        walletConnectProvider.off('disconnect')
      }
    }
  }, [])

  useEffect(() => {
    if (signer && testUSDT && laterPay) {
      loadData()
    }
  }, [signer, testUSDT, laterPay])

  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        setStatus({ type: 'error', message: 'MetaMaskがインストールされていません' })
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setProvider(provider)
      setSigner(signer)
      setAccount(address)
      setWalletType('metamask')

      // コントラクトアドレスが設定されている場合のみ、コントラクトインスタンスを作成
      if (testUSDTAddress && laterPayAddress) {
        const testUSDTContract = new ethers.Contract(testUSDTAddress, TEST_USDT_ABI, signer)
        const laterPayContract = new ethers.Contract(laterPayAddress, LATER_PAY_ABI, signer)

        setTestUSDT(testUSDTContract)
        setLaterPay(laterPayContract)

        // 管理者・オーナーチェック
        try {
          const adminStatus = await laterPayContract.admins(address)
          const ownerAddress = await laterPayContract.owner()
          setIsAdmin(adminStatus)
          setIsOwner(address.toLowerCase() === ownerAddress.toLowerCase())
        } catch (error) {
          console.error('管理者チェックエラー:', error)
          setIsAdmin(false)
          setIsOwner(false)
        }
      } else {
        setTestUSDT(null)
        setLaterPay(null)
        setIsAdmin(false)
        setIsOwner(false)
        setStatus({ type: 'warning', message: 'ウォレットに接続しました。コントラクトアドレスを設定してください。' })
        return
      }

      setStatus({ type: 'success', message: 'MetaMaskに接続しました' })
    } catch (error) {
      setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
    }
  }

  const handleWalletConnectConnect = async () => {
    try {
      if (!walletConnectProvider) {
        setStatus({ type: 'error', message: 'WalletConnectが初期化されていません' })
        return
      }

      setStatus({ type: 'info', message: 'ウォレットを選択してください...' })
      
      // 接続オプションを指定（スマホ対応）
      try {
        await walletConnectProvider.connect({
          optionalChains: [1, 11155111, 56, 97],
        })
      } catch (error) {
        // 接続エラーをキャッチ（ユーザーがキャンセルした場合など）
        if (error.message !== 'User rejected' && !error.message.includes('rejected')) {
          console.error('WalletConnect接続エラー:', error)
          setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
        }
        return
      }

      const ethersProvider = new ethers.BrowserProvider(walletConnectProvider)
      const signer = await ethersProvider.getSigner()
      const address = await signer.getAddress()

      setProvider(ethersProvider)
      setSigner(signer)
      setAccount(address)
      setWalletType('walletconnect')

      // コントラクトアドレスが設定されている場合のみ、コントラクトインスタンスを作成
      if (testUSDTAddress && laterPayAddress) {
        const testUSDTContract = new ethers.Contract(testUSDTAddress, TEST_USDT_ABI, signer)
        const laterPayContract = new ethers.Contract(laterPayAddress, LATER_PAY_ABI, signer)

        setTestUSDT(testUSDTContract)
        setLaterPay(laterPayContract)

        // 管理者・オーナーチェック
        try {
          const adminStatus = await laterPayContract.admins(address)
          const ownerAddress = await laterPayContract.owner()
          setIsAdmin(adminStatus)
          setIsOwner(address.toLowerCase() === ownerAddress.toLowerCase())
        } catch (error) {
          console.error('管理者チェックエラー:', error)
          setIsAdmin(false)
          setIsOwner(false)
        }
      } else {
        setTestUSDT(null)
        setLaterPay(null)
        setIsAdmin(false)
        setIsOwner(false)
        setStatus({ type: 'warning', message: 'ウォレットに接続しました。コントラクトアドレスを設定してください。' })
        return
      }

      setStatus({ type: 'success', message: 'WalletConnectに接続しました' })
    } catch (error) {
      if (error.message !== 'User rejected the request') {
        setStatus({ type: 'error', message: `接続エラー: ${error.message}` })
      }
    }
  }

  const disconnectWallet = async () => {
    try {
      if (walletType === 'walletconnect' && walletConnectProvider) {
        await walletConnectProvider.disconnect()
      } else if (walletType === 'metamask' && window.ethereum) {
        // MetaMaskの場合は、アカウントをクリアするだけ
        setProvider(null)
        setSigner(null)
        setAccount(null)
        setTestUSDT(null)
        setLaterPay(null)
        setWalletType(null)
        setStatus({ type: 'info', message: 'ウォレットが切断されました' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `切断エラー: ${error.message}` })
    }
  }

  const loadData = async () => {
    try {
      if (!account || !testUSDT || !laterPay) return

      // コントラクトアドレスのチェック
      if (!testUSDTAddress || !laterPayAddress) {
        setStatus({ type: 'warning', message: 'コントラクトアドレスが設定されていません。管理者ページの設定からアドレスを設定してください。' })
        return
      }

      // 残高取得
      const decimals = await testUSDT.decimals()
      const balance = await testUSDT.balanceOf(account)
      setBalance(ethers.formatUnits(balance, decimals))

      // Allowance取得（コントラクトが引き落とせる額）
      const allowanceAmount = await testUSDT.allowance(account, laterPayAddress)
      setAllowance(ethers.formatUnits(allowanceAmount, decimals))

      // コントラクトの残高取得
      const contractBal = await laterPay.getContractBalance()
      setContractBalance(ethers.formatUnits(contractBal, decimals))

      // ユーザーの承認リスト取得
      const count = await laterPay.userApprovalCount(account)
      const userApprovals = []
      for (let i = 0; i < count; i++) {
        const approval = await laterPay.getUserApproval(account, i)
        userApprovals.push({
          id: i,
          ...approval,
          amount: ethers.formatUnits(approval.amount, decimals),
          approvedAt: new Date(Number(approval.approvedAt) * 1000).toLocaleString('ja-JP'),
          dueDate: new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP'),
          dueDateTimestamp: Number(approval.dueDate),
        })
      }
      setApprovals(userApprovals)
    } catch (error) {
      // コントラクトアドレスが空の場合のエラーを無視
      if (error.code === 'UNCONFIGURED_NAME' || error.message.includes('ENS name')) {
        setStatus({ type: 'warning', message: 'コントラクトアドレスが設定されていません。管理者ページの設定からアドレスを設定してください。' })
        return
      }
      console.error('データ読み込みエラー:', error)
      setStatus({ type: 'error', message: `データ読み込みエラー: ${error.message}` })
    }
  }

  const handleApprove = async () => {
    try {
      if (!amount || !dueDate) {
        setStatus({ type: 'error', message: '金額と引き落とし日を入力してください' })
        return
      }

      const decimals = await testUSDT.decimals()
      const amountWei = ethers.parseUnits(amount, decimals)
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000)

      // LaterPayV2では、approvePayment内でsafeTransferFromを使用するため、
      // 事前にapproveが必要
      const currentAllowance = await testUSDT.allowance(account, laterPayAddress)
      if (currentAllowance < amountWei) {
        setStatus({ type: 'info', message: 'トークンの承認中...' })
        const approveTx = await testUSDT.approve(laterPayAddress, amountWei)
        await approveTx.wait()
        setStatus({ type: 'success', message: 'トークンの承認が完了しました' })
      }

      setStatus({ type: 'info', message: '後払い承認処理中...' })
      const tx = await laterPay.approvePayment(amountWei, dueDateTimestamp)
      await tx.wait()

      setStatus({ type: 'success', message: '後払いが承認されました！' })
      setAmount('')
      setDueDate('')
      await loadData()
    } catch (error) {
      setStatus({ type: 'error', message: `エラー: ${error.message}` })
    }
  }




  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Later Pay - 後払いシステム</h1>
      </div>

      {!account ? (
        <div className="card">
          <h2>ウォレット接続</h2>
          <p>ウォレットを接続してサービスを開始してください</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={connectMetaMask} className="wallet-button metamask">
              MetaMaskに接続
            </button>
            {WALLETCONNECT_PROJECT_ID && (
              <button onClick={handleWalletConnectConnect} className="wallet-button walletconnect">
                WalletConnectで接続
              </button>
            )}
          </div>
          {!WALLETCONNECT_PROJECT_ID && (
            <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
              WalletConnectを使用するには、環境変数 VITE_WALLETCONNECT_PROJECT_ID を設定してください
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="card">
            <h2>アカウント情報</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <p className="address">アドレス: {account}</p>
                <p className="wallet-type">接続方法: {walletType === 'metamask' ? 'MetaMask' : 'WalletConnect'}</p>
              </div>
              <button onClick={disconnectWallet} className="disconnect-button">
                切断
              </button>
            </div>
            <div className="balance-info">
              <p className="balance">USDT残高: {balance}</p>
              <p className="allowance">承認額（Allowance）: {allowance} USDT</p>
              <p className="contract-balance">コントラクト残高: {contractBalance} USDT</p>
            </div>
            {isOwner && <p style={{ color: '#ff6b6b', fontWeight: 'bold', marginTop: '10px' }}>🔑 オーナー</p>}
            {isAdmin && !isOwner && <p style={{ color: '#764ba2', fontWeight: 'bold', marginTop: '10px' }}>👤 管理者</p>}
            <button onClick={loadData} style={{ marginTop: '10px' }}>データを更新</button>
          </div>

          <div className="card">
            <h2>後払い承認</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              後払いボタンを押すと、指定した日時に自動的に引き落としが可能になります。
            </p>
            <label>
              金額 (USDT):
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                step="0.000000000000000001"
                min="0"
              />
            </label>
            <label>
              引き落とし日時:
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <button 
              onClick={handleApprove} 
              className="approve-button"
              disabled={!amount || !dueDate}
            >
              後払いを承認する
            </button>

            <div className="approval-list">
              <h3>あなたの承認リスト</h3>
              {approvals.length === 0 ? (
                <p>承認がありません</p>
              ) : (
                approvals.map((approval) => (
                  <div key={approval.id} className={`approval-item ${approval.executed ? 'executed' : ''}`}>
                    <p><strong>承認ID:</strong> {approval.id}</p>
                    <p><strong>金額:</strong> {approval.amount} USDT</p>
                    <p><strong>承認日時:</strong> {approval.approvedAt}</p>
                    <p><strong>引き落とし日:</strong> {approval.dueDate}</p>
                    <p><strong>状態:</strong> {approval.executed ? '✅ 実行済み' : '⏳ 待機中'}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </>
      )}

      {status.message && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  )
}

export default App
