# デプロイ手順

## 1. ウォレットの準備

新しいウォレットを生成する場合：
```bash
npm run generate-wallet
```

生成されたアドレスにSepolia ETHを送金してください。

## 2. 環境変数の設定

`.env`ファイルを作成し、以下を設定：

```
PRIVATE_KEY=0x...（生成されたプライベートキー）
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ETHERSCAN_API_KEY=（オプション）
```

## 3. デプロイ

```bash
npm run deploy:sepolia
```

デプロイ後、`.env`ファイルに以下のアドレスが自動保存されます：
- `TEST_USDT_ADDRESS`
- `LATER_PAY_ADDRESS`

## 4. デプロイ後の確認

```bash
# 残高確認
npm run balance

# トークンをミント（テスト用）
npm run mint <your_address> 1000
```

## 5. テスト

```bash
# 支払い承認（100 tUSDT、7日後）
npm run approve 100 7

# 承認リスト確認
npm run list

# 引き落とし実行（管理者のみ、7日後）
npm run execute <user_address> 0
```

