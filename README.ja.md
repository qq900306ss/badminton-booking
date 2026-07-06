# badminton-booking — 当日参加者フロントエンド

[中文](README.md) · [English](README.en.md) · **日本語**

バドミントンのコート管理システム。当日参加者が QR コードをスキャンして入場 → 本人を選択 → レベルを選択 → 順番待ち／出場 → コートのリアルタイム状況を確認、という流れです。

🔗 **本番**: https://d2mg2bpjvlg672.cloudfront.net

## 関連

| | URL |
|--|------|
| 主催者管理画面 (admin) | https://d1r9u0ja59y4rv.cloudfront.net |
| バックエンド API | https://pp2p4ln2cogxt4mi5f2wl3rqi40vskvs.lambda-url.ap-northeast-1.on.aws |

## ローカル開発

```bash
npm install
npm run dev   # http://localhost:5174
```

## 多言語対応 (i18n)

UI は **繁体字中国語 / 英語 / 日本語** に対応しています。右上の 🌐 ピッカーで切り替えでき、選択は `localStorage` に保存されます。翻訳は `src/i18n/locales/*.json`（コンポーネントごとに `<Namespace>.<lang>.json` フラグメント）にあります。

## デプロイ

`main` に push → GitHub Actions が自動でビルドし、S3 にアップロード + CloudFront をキャッシュ無効化します。
詳細は `../DEPLOY.md` を参照してください。
