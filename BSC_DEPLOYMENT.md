# BSC（Binance Smart Chain）デプロイガイド

## BSCネットワークへの対応

このシステムはBSC（Binance Smart Chain）ネットワークに対応しています。

### 対応ネットワーク

- **BSC Mainnet** (Chain ID: 56)
- **BSC Testnet** (Chain ID: 97)

---

## 環境変数の設定

`.env`ファイルに以下を追加してください：

### BSC Mainnet用

```
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
BSCSCAN_API_KEY=your_bscscan_api_key_here
PRIVATE_KEY=your_private_key_here
```

### BSC Testnet用

```
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSCSCAN_API_KEY=your_bscscan_api_key_here
PRIVATE_KEY=your_private_key_here
```

**BSCScan API Keyの取得方法：**
1. https://bscscan.com/ にアクセス
2. アカウントを作成（無料）
3. API KeysセクションでAPI Keyを生成
4. `.env`ファイルに設定

**BSC RPC URL（無料オプション）：**
- Mainnet: 
  - `https://bsc-dataseed1.binance.org/`
  - `https://bsc-dataseed2.binance.org/`
  - `https://bsc-dataseed3.binance.org/`
- Testnet:
  - `https://data-seed-prebsc-1-s1.binance.org:8545/`
  - `https://data-seed-prebsc-2-s1.binance.org:8545/`

**有料RPCプロバイダー（推奨）：**
- Alchemy: https://www.alchemy.com/
- Infura: https://www.infura.io/
- QuickNode: https://www.quicknode.com/

---

## デプロイ手順

### 1. BSC Testnetへのデプロイ（推奨：まずテスト）

```bash
npm run deploy:bsc-testnet
```

**事前準備：**
- BSC Testnet BNBを取得（フォーセット: https://testnet.bnbchain.org/faucet-smart）
- `.env`に`BSC_TESTNET_RPC_URL`と`PRIVATE_KEY`を設定

### 2. BSC Mainnetへのデプロイ（本番環境）

```bash
npm run deploy:bsc
```

**事前準備：**
- BSC Mainnet BNBを取得（取引所から送金）
- `.env`に`BSC_RPC_URL`と`PRIVATE_KEY`を設定
- **十分なBNB残高があることを確認**（ガス代用）

---

## デプロイ後の設定

### フロントエンドの環境変数（Vercel）

デプロイ後、Vercelの環境変数に以下を設定：

```
VITE_TEST_USDT_ADDRESS=0x...（BSCでデプロイしたTestUSDTアドレス）
VITE_LATER_PAY_ADDRESS=0x...（BSCでデプロイしたLaterPayアドレス）
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
```

### ウォレット接続時の注意

- MetaMaskでBSCネットワークを追加する必要があります
- BSC Mainnet: Chain ID 56
- BSC Testnet: Chain ID 97

**MetaMaskにBSCネットワークを追加：**
1. MetaMaskを開く
2. ネットワーク選択 → 「ネットワークを追加」
3. 手動で追加：
   - **BSC Mainnet**: 
     - ネットワーク名: `BSC Mainnet`
     - RPC URL: `https://bsc-dataseed1.binance.org/`
     - チェーンID: `56`
     - 通貨記号: `BNB`
     - ブロックエクスプローラー: `https://bscscan.com/`
   - **BSC Testnet**:
     - ネットワーク名: `BSC Testnet`
     - RPC URL: `https://data-seed-prebsc-1-s1.binance.org:8545/`
     - チェーンID: `97`
     - 通貨記号: `BNB`
     - ブロックエクスプローラー: `https://testnet.bscscan.com/`

---

## コスト比較

### ガス代（概算）

- **Ethereum Mainnet**: 非常に高い（$10-100+）
- **BSC Mainnet**: 安い（$0.01-0.1程度）
- **Sepolia Testnet**: 無料（テストネット）
- **BSC Testnet**: 無料（テストネット）

BSCはEthereumと比べて大幅にガス代が安いため、本番環境での運用コストを抑えられます。

---

## トラブルシューティング

### デプロイエラー: Insufficient balance

- BSC Testnet: フォーセットからBNBを取得
- BSC Mainnet: 取引所からBNBを送金

### トランザクションが承認されない

- RPC URLを変更してみる
- ガス価格を調整する（Hardhatが自動調整）

### コントラクトが検証されない

- BSCScanで手動検証: https://bscscan.com/verifyContract
- または: `npx hardhat verify --network bsc <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>`

---

## まとめ

BSCネットワークへの対応により：

✅ **低コスト**: Ethereumより大幅に安いガス代  
✅ **高速**: ブロック生成が速い（約3秒）  
✅ **互換性**: EVM互換のため、既存のコントラクトがそのまま動作  
✅ **多様なトークン**: BEP-20トークン（USDT, BUSD等）が利用可能  

本番環境ではBSC Mainnetの使用を推奨します。

