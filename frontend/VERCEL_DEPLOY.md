# Vercelデプロイガイド

## Vercelでの無料デプロイ方法

### 1. Vercelアカウントの作成
1. https://vercel.com にアクセス
2. GitHubアカウントでサインアップ（無料）

### 2. プロジェクトのデプロイ

#### 方法A: Vercel CLIを使用（推奨）
```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

#### 方法B: GitHub経由でデプロイ
1. GitHubにリポジトリをプッシュ
2. Vercelダッシュボードで「New Project」をクリック
3. GitHubリポジトリを選択
4. 設定：
   - **Root Directory**: `frontend` を指定
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：

```
VITE_TEST_USDT_ADDRESS=0x...
VITE_LATER_PAY_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
```

**設定方法：**
1. Vercelダッシュボードでプロジェクトを選択
2. 「Settings」→「Environment Variables」
3. 上記の環境変数を追加
4. 「Redeploy」をクリック

### 4. デプロイ後の確認

- デプロイが完了すると、URLが表示されます（例：`https://your-project.vercel.app`）
- このURLにアクセスして動作確認

### 5. カスタムドメイン（オプション）

無料プランでもカスタムドメインを設定できます：
1. Vercelダッシュボードで「Settings」→「Domains」
2. ドメインを追加

## 注意事項

- **無料プランの制限**：
  - 帯域幅: 100GB/月
  - ビルド時間: 45分/月
  - 通常の使用では十分です

- **環境変数**：
  - 本番環境用に環境変数を設定してください
  - 開発環境と本番環境で異なる値を設定可能

- **自動デプロイ**：
  - GitHubにプッシュすると自動的にデプロイされます
  - プルリクエストごとにプレビュー環境が作成されます

## トラブルシューティング

### ビルドエラーが発生する場合
- `package.json`の依存関係を確認
- ローカルで`npm run build`が成功することを確認

### 環境変数が反映されない場合
- デプロイ後に「Redeploy」を実行
- 環境変数の名前が`VITE_`で始まっていることを確認

