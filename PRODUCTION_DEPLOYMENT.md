# 本番環境デプロイガイド（実際のUSDT使用）

## 概要

本番環境では、TestUSDTをデプロイする代わりに、既存のUSDTコントラクトを使用します。

### BSC上のUSDTアドレス
```
0x55d398326f99059ff775485246999027b3197955
```

---

## デプロイ前の準備

### 1. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# BSC RPC URL
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# デプロイ用秘密鍵
PRIVATE_KEY=your_private_key_here

# 本番環境用USDTアドレス（BSC）
USDT_ADDRESS=0x55d398326f99059ff775485246999027b3197955

# BSCScan API Key（コントラクト検証用、オプション）
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

**重要**: `USDT_ADDRESS`を設定しないと、デプロイスクリプトはエラーになります。

---

## デプロイ手順

### BSC Mainnetへのデプロイ

```bash
npm run deploy:bsc-production
```

または

```bash
hardhat run scripts/deploy-production.js --network bsc
```

### デプロイ内容

1. **USDTコントラクトの検証**
   - 指定されたUSDTアドレスが有効か確認
   - シンボルとデシマルを確認

2. **LaterPayV2コントラクトのデプロイ**
   - USDTアドレスをコンストラクタに渡してデプロイ
   - TestUSDTはデプロイしません

3. **アドレスの保存**
   - `.env`ファイルに自動保存

---

## デプロイ後の設定

### フロントエンド環境変数（Vercel）

Vercelダッシュボードで以下を設定：

```
VITE_TEST_USDT_ADDRESS=0x55d398326f99059ff775485246999027b3197955
VITE_LATER_PAY_ADDRESS=0x...（デプロイされたLaterPayV2アドレス）
VITE_WALLETCONNECT_PROJECT_ID=62a6213c06a08be363811b963ac74d2c
```

**注意**: 
- `VITE_TEST_USDT_ADDRESS`という名前ですが、実際には本番環境のUSDTアドレスを設定します
- フロントエンドのコードはこの環境変数からUSDTアドレスを読み込みます

---

## テスト環境 vs 本番環境

### テスト環境（Sepolia/BSC Testnet）

```bash
npm run deploy:sepolia
# または
npm run deploy:bsc-testnet
```

- TestUSDTをデプロイ
- LaterPayV2をデプロイ
- 両方のアドレスを環境変数に設定

### 本番環境（BSC Mainnet）

```bash
npm run deploy:bsc-production
```

- TestUSDTはデプロイしない
- 既存のUSDTアドレスを使用
- LaterPayV2のみデプロイ

---

## ガス代見積もり（本番環境）

### LaterPayV2のみデプロイ

- **ガス量**: 約 1,370,000ガス
- **ガス価格**: 5 Gwei（BSC平均）
- **ガス代**: 1,370,000 × 5 Gwei = **0.00685 BNB**
- **USD換算**（BNB = $300）: **約 $2.06**

**TestUSDTをデプロイしないため、約$1.28節約できます！**

---

## トラブルシューティング

### エラー: USDT address not set

`.env`ファイルに`USDT_ADDRESS`を設定してください。

### エラー: Could not verify USDT contract

- USDTアドレスが正しいか確認
- ネットワークが正しいか確認（BSC MainnetでBSCのUSDTアドレスを使用）
- RPC URLが正しく設定されているか確認

### フロントエンドでUSDTが表示されない

- Vercelの環境変数に`VITE_TEST_USDT_ADDRESS`を設定
- デプロイ後に「Redeploy」を実行
- ブラウザのキャッシュをクリア

---

## まとめ

### 本番環境デプロイの流れ

1. `.env`に`USDT_ADDRESS=0x55d398326f99059ff775485246999027b3197955`を設定
2. `npm run deploy:bsc-production`を実行
3. デプロイされたLaterPayV2アドレスをコピー
4. Vercelの環境変数に設定：
   - `VITE_TEST_USDT_ADDRESS=0x55d398326f99059ff775485246999027b3197955`
   - `VITE_LATER_PAY_ADDRESS=0x...（デプロイされたアドレス）`
5. Vercelで「Redeploy」を実行

これで本番環境の準備完了です！

