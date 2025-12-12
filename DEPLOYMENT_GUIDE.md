# Vercelデプロイガイド

## GitHubへのプッシュ

```bash
# 初回コミット
git commit -m "Initial commit: Later Pay system"

# GitHubにプッシュ
git branch -M main
git push -u origin main
```

## Vercelでのインポート手順

### 1. Vercelにアクセス
- https://vercel.com にアクセス
- GitHubアカウントでログイン（無料）

### 2. プロジェクトをインポート
1. ダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」を選択
3. GitHubリポジトリ `kekeke29341/laterpay` を選択
4. 「Import」をクリック

### 3. プロジェクト設定

**重要：以下の設定を必ず行ってください**

#### Root Directory
- 「Root Directory」をクリック
- `frontend` を入力して「Continue」

#### Framework Preset
- **Framework Preset**: Vite（自動検出されるはず）

#### Build Settings
- **Build Command**: `npm run build`（自動設定されるはず）
- **Output Directory**: `dist`（自動設定されるはず）
- **Install Command**: `npm install`（自動設定されるはず）

### 4. 環境変数の設定

「Environment Variables」セクションで以下を追加：

```
VITE_TEST_USDT_ADDRESS=0x...
VITE_LATER_PAY_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
```

**注意**: コントラクトアドレスは後で設定できます。まずはWalletConnect Project IDだけ設定してデプロイすることも可能です。

### 5. デプロイ実行
- 「Deploy」をクリック
- 数分でデプロイが完了します

### 6. デプロイ後の確認
- デプロイが完了すると、URLが表示されます（例：`https://laterpay.vercel.app`）
- このURLにアクセスして動作確認

## 環境変数の後から追加する方法

1. Vercelダッシュボードでプロジェクトを選択
2. 「Settings」→「Environment Variables」
3. 環境変数を追加
4. 「Redeploy」をクリック

## カスタムドメイン（オプション）

無料プランでもカスタムドメインを設定できます：
1. 「Settings」→「Domains」
2. ドメインを追加

## トラブルシューティング

### ビルドエラーが発生する場合
- Root Directoryが`frontend`に設定されているか確認
- ローカルで`cd frontend && npm run build`が成功することを確認

### 環境変数が反映されない場合
- 環境変数の名前が`VITE_`で始まっていることを確認
- デプロイ後に「Redeploy」を実行

