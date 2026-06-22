# badminton-booking — 臨打人前端

羽球場地管理系統:臨打人掃 QR code 進場 → 選身份 → 選程度 → 排隊/上場 → 看球場即時狀態。

🔗 **線上**:https://d2mg2bpjvlg672.cloudfront.net

## 相關

| | 網址 |
|--|------|
| 團主後台 (admin) | https://d1r9u0ja59y4rv.cloudfront.net |
| 後端 API | https://pp2p4ln2cogxt4mi5f2wl3rqi40vskvs.lambda-url.ap-northeast-1.on.aws |

## 本機開發

```bash
npm install
npm run dev   # http://localhost:5174
```

## 部署

push 到 `main` → GitHub Actions 自動 build 並上傳 S3 + invalidate CloudFront。
完整部署說明見 `../DEPLOY.md`。
