# Vercel環境変数設定ガイド

## 必須環境変数

Vercelダッシュボードで以下の環境変数を設定してください。

### 1. WalletConnect Project ID（必須）

```
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
```

**説明**: WalletConnect接続に使用するProject IDです。  
**取得方法**: https://cloud.reown.com/ で取得  
**現在の値**: 既に設定済み

---

### 2. TestUSDT コントラクトアドレス（推奨）

```
VITE_TEST_USDT_ADDRESS=0x...
```

**説明**: テスト用USDTトークンのコントラクトアドレスです。  
**設定方法**: デプロイしたTestUSDTコントラクトのアドレスを設定  
**例**: `0x1234567890123456789012345678901234567890`

---

### 3. LaterPay コントラクトアドレス（推奨）

```
VITE_LATER_PAY_ADDRESS=0x...
```

**説明**: LaterPayメインコントラクトのアドレスです。  
**設定方法**: デプロイしたLaterPayV2コントラクトのアドレスを設定  
**例**: `0x1234567890123456789012345678901234567890`

---

## 環境変数の設定方法

### Vercelダッシュボードでの設定手順

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」をクリック
4. 「Add New」をクリック
5. 以下の情報を入力：
   - **Key**: 環境変数名（例: `VITE_TEST_USDT_ADDRESS`）
   - **Value**: 環境変数の値（例: `0x1234...`）
   - **Environment**: すべての環境（Production, Preview, Development）を選択
6. 「Save」をクリック
7. **重要**: 環境変数を追加した後は、「Deployments」タブで「Redeploy」をクリック

---

## 環境変数の優先順位

アプリケーションは以下の順序でコントラクトアドレスを読み込みます：

1. **ローカルストレージ**（ブラウザに保存された値）
2. **環境変数**（Vercelで設定した値）
3. **デフォルト値**（空文字列）

つまり、ユーザーがブラウザで設定した値が最優先されますが、初回アクセス時は環境変数の値が使用されます。

---

## 現在の設定状況

- ✅ `VITE_WALLETCONNECT_PROJECT_ID`: 設定済み
- ⚠️ `VITE_TEST_USDT_ADDRESS`: 未設定（コントラクトデプロイ後に設定）
- ⚠️ `VITE_LATER_PAY_ADDRESS`: 未設定（コントラクトデプロイ後に設定）

---

## コントラクトアドレスの取得方法

### Hardhatでデプロイした場合

```bash
cd /Users/cont-t-a-nakano/later_pay
npx hardhat run scripts/deploy.js --network sepolia
```

デプロイスクリプトの出力から、以下のアドレスをコピー：
- `TestUSDT deployed to: 0x...`
- `LaterPayV2 deployed to: 0x...`

### 既にデプロイ済みの場合

Etherscanなどで確認したコントラクトアドレスを使用してください。

---

## トラブルシューティング

### 環境変数が反映されない場合

1. 環境変数を追加した後、必ず「Redeploy」を実行
2. 環境変数名が`VITE_`で始まっていることを確認
3. ブラウザのキャッシュをクリア
4. Vercelのビルドログで環境変数が正しく読み込まれているか確認

### コントラクトアドレスが空の場合

- 環境変数が設定されていない
- 環境変数名にタイポがある
- デプロイ後にRedeployしていない

---

## まとめ

**最小限の設定（動作確認用）**:
```
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
```

**完全な設定（本番環境用）**:
```
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
VITE_TEST_USDT_ADDRESS=0x...
VITE_LATER_PAY_ADDRESS=0x...
```

コントラクトアドレスが決まりましたら、お知らせください。設定をサポートします！

