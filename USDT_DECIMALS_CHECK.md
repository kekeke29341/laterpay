# BSC上のUSDT Decimals確認ガイド

## 重要な確認事項

BSC上のUSDTには複数のバージョンがあり、decimalsが異なる可能性があります。

### 1. 標準的なBSC USDT（0x55d398326f99059ff775485246999027b3197955）

このアドレスは通常 **6 decimals** を使用します。

### 2. Binance-Peg BSC-USD（BSC-USD）

記事で言及されているBinance-Peg BSC-USDは、**18 decimals** を使用する可能性があります。

---

## 現在のシステムの対応

**良いニュース**: 現在のシステムは動的にdecimalsを取得しているため、どちらでも動作します！

### フロントエンドの実装

```javascript
// コントラクトから動的にdecimalsを取得
const decimals = await testUSDT.decimals()

// 取得したdecimalsを使用
const amountWei = ethers.parseUnits(amount, decimals)
```

この実装により：
- ✅ 6 decimalsのUSDTでも動作
- ✅ 18 decimalsのUSDTでも動作
- ✅ その他のdecimalsでも動作

---

## 確認方法

### 1. コントラクトアドレスを確認

使用するUSDTコントラクトのアドレスを確認してください。

### 2. BSCScanで確認

1. https://bscscan.com/ にアクセス
2. USDTコントラクトアドレスを検索
3. 「Read Contract」タブを開く
4. `decimals()` 関数を実行して確認

### 3. フロントエンドで確認

ウォレット接続後、ブラウザのコンソールで以下を実行：

```javascript
// コントラクトインスタンスを取得（既に接続済みの場合）
const decimals = await testUSDT.decimals()
console.log('USDT decimals:', decimals)
```

---

## 実際のUSDTアドレス（BSC Mainnet）

### 標準的なUSDT（6 decimals）

```
0x55d398326f99059ff775485246999027b3197955
```

このアドレスは通常6 decimalsを使用します。

### Binance-Peg BSC-USD（18 decimalsの可能性）

別のコントラクトアドレスの可能性があります。使用するアドレスを確認してください。

---

## テスト方法

### 1. テストネットで確認

```bash
# BSC Testnetでデプロイ
npm run deploy:bsc-testnet

# フロントエンドで接続して、decimalsを確認
```

### 2. 本番環境で確認

本番環境にデプロイする前に、使用するUSDTアドレスのdecimalsを確認してください。

---

## まとめ

- ✅ 現在のシステムは動的にdecimalsを取得するため、6でも18でも動作します
- ⚠️ 使用するUSDTコントラクトアドレスを確認してください
- ⚠️ 0x55d398326f99059ff775485246999027b3197955は通常6 decimalsです
- ⚠️ Binance-Peg BSC-USDが別のアドレスで18 decimalsの可能性があります

**推奨**: デプロイ前に、使用するUSDTアドレスのdecimalsをBSCScanで確認してください。

