# デプロイ情報

## 生成されたウォレットアドレス

**アドレス:** `0x8d3516e464a7E0e92AC74FdD6C77fcC7fdB088bD`

このアドレスにSepolia ETHを送金してください。

## 次のステップ

1. **Sepolia ETHを送金**
   - フォーセット: https://sepoliafaucet.com/
   - または: https://www.alchemy.com/faucets/ethereum-sepolia
   - 少なくとも0.01 ETHを送金してください

2. **`.env`ファイルを作成**
   ```
   PRIVATE_KEY=0xb8bca0859770c26af4855ad57036136b4377d93bad2ee005383a949df7ecdd69
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   ETHERSCAN_API_KEY=
   ```

3. **デプロイ実行**
   ```bash
   npm run deploy:sepolia
   ```

4. **デプロイ後の確認**
   ```bash
   # 残高確認
   npm run balance
   
   # トークンをミント
   npm run mint 0x8d3516e464a7E0e92AC74FdD6C77fcC7fdB088bD 1000
   ```

## コマンドライン操作

デプロイ後、以下のコマンドが使用できます：

- `npm run balance [address]` - 残高確認
- `npm run mint <address> <amount>` - トークンミント
- `npm run approve <amount> [days]` - 支払い承認
- `npm run list [address]` - 承認リスト表示
- `npm run execute <user_address> <approval_id>` - 引き落とし実行

