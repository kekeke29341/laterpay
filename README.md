# Later Pay - ブロックチェーン後払いシステム

Sepoliaテストネット上で動作する、USDTを使った後払いシステムです。

## 機能

- ユーザーが商品購入時に支払いを承認
- 指定した引き落とし日に管理者が引き落としを実行
- テストUSDTトークン（tUSDT）を使用
- 管理者権限による引き落とし制御
- **WalletConnect対応** - MetaMaskとWalletConnectの両方に対応
- **Allowance表示** - コントラクトが引き落とせる承認額を表示
- **GUI操作** - ブラウザから簡単に後払い承認と引き落としが可能

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下を設定してください：

```
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**新しいウォレットを生成する場合：**
```bash
npm run generate-wallet
```

生成されたアドレスにSepolia ETHを送金してください（フォーセット: https://sepoliafaucet.com/）

### 3. コントラクトのコンパイル

```bash
npm run compile
```

### 4. テストの実行

```bash
npm test
```

### 5. Sepoliaテストネットへのデプロイ

```bash
npm run deploy:sepolia
```

デプロイ後、以下のアドレスが表示されます：
- TestUSDT コントラクトアドレス
- LaterPay コントラクトアドレス

### 6. フロントエンドの設定

`frontend/.env`ファイルを作成し、デプロイしたコントラクトアドレスを設定：

```
VITE_TEST_USDT_ADDRESS=0x...
VITE_LATER_PAY_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**WalletConnect Project IDの取得方法：**
1. https://cloud.reown.com/ にアクセス
2. アカウントを作成（無料）
3. 新しいプロジェクトを作成
4. Project IDをコピーして`.env`に設定

**注意：** WalletConnect Project IDが設定されていない場合、MetaMaskのみ使用可能です。

### 7. フロントエンドの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## コマンドライン操作

デプロイ後、以下のコマンドでトランザクションを送信できます：

### 残高確認
```bash
# 自分の残高を確認
npm run balance

# 指定アドレスの残高を確認
npm run balance 0x...
```

### トークンのミント（テスト用）
```bash
# 指定アドレスにトークンをミント
npm run mint 0x... 1000
```

### 支払い承認
```bash
# 100 tUSDTを7日後に引き落とし可能にする
npm run approve 100 7

# デフォルトは1日後
npm run approve 100
```

### 承認リストの確認
```bash
# 自分の承認リストを表示
npm run list

# 指定ユーザーの承認リストを表示
npm run list 0x...
```

### 引き落とし実行（管理者のみ）
```bash
# ユーザーの承認を引き落とし
npm run execute 0x... 0
```

### ウォレット生成
```bash
# 新しいウォレットアドレスを生成
npm run generate-wallet
```

## 使い方

### コマンドラインから

1. `.env`ファイルに`PRIVATE_KEY`を設定
2. デプロイ後、`.env`にコントラクトアドレスが自動保存されます
3. 上記のコマンドでトランザクションを送信

### フロントエンドから

#### ユーザー側

1. **ウォレット接続**
   - MetaMaskまたはWalletConnectで接続
   - WalletConnectを使用すると、モバイルウォレットアプリからも接続可能
2. **後払い承認**
   - 金額と引き落とし日時を入力
   - 「後払いを承認する」ボタンをクリック
   - トークンの承認と後払い承認の2つのトランザクションを承認
3. **承認状況の確認**
   - 承認額（Allowance）が表示されます
   - 自分の承認リストで状態を確認できます

#### 管理者側

1. **ウォレット接続**
   - 管理者アカウントでMetaMaskまたはWalletConnectを接続
2. **引き落とし実行**
   - ユーザー検索でアドレスを検索
   - 実行可能な承認を確認（引き落とし日が過ぎているもの）
   - 「引き落としを実行」ボタンをクリック
   - 任意のタイミングで引き落としを実行可能（引き落とし日が過ぎている場合）

## コントラクト

### TestUSDT.sol
- ERC20互換のテストUSDTトークン
- 6桁の小数点（USDTと同じ）

### LaterPay.sol
- 後払いシステムのメインコントラクト
- 支払い承認機能
- 管理者による引き落とし実行機能
- 所有者による管理者追加/削除機能

## セキュリティ

- ReentrancyGuardによる再入攻撃対策
- SafeERC20による安全なトークン転送
- 管理者権限の厳格な管理

## ライセンス

MIT

