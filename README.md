# ⚽ W杯2026 予想バトル

2026 FIFAワールドカップの結果を予想してポイントを競うNext.jsアプリ。

## 機能

- 🇯🇵 日本代表グループステージ3試合のスコア予想
- 🏆 大会最終順位（1〜4位）予想  
- ⭐ 得点王予想（ボーナス）
- 📊 リアルタイムランキング（詳細ページへリンク）
- ✏️ **大会開始前まで予想編集可・開始後は自動ロック**
- 🔄 football-data.org APIから試合結果を自動取得
- 🔥 Firebase Firestoreでデータ管理

---

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com) でプロジェクト作成
2. **Firestore Database** を作成（本番モードで開始）
3. **プロジェクト設定 > マイアプリ > ウェブアプリ** を追加してFirebase設定を取得
4. **プロジェクト設定 > サービスアカウント > 新しい秘密鍵の生成** でJSONをダウンロード

### 3. football-data.org APIキー取得

1. [football-data.org](https://www.football-data.org/client/register) で無料登録
2. APIキーをコピー（無料プランで W杯対応）

### 4. 環境変数設定

`.env.local.example` を `.env.local` にコピーして値を入力：

```bash
cp .env.local.example .env.local
```

```env
# Firebase クライアント
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...

# Firebase Admin（サービスアカウントJSONから）
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# football-data.org
FOOTBALL_DATA_API_KEY=your_api_key_here
```

### 5. ローカル起動

```bash
npm run dev
```

→ http://localhost:3000

---

## Vercel へのデプロイ

```bash
# GitHubにプッシュ
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/ユーザー名/wc2026.git
git push -u origin main
```

1. [Vercel](https://vercel.com) でリポジトリをインポート
2. **Environment Variables** に `.env.local` の内容をすべて追加
   - `FIREBASE_PRIVATE_KEY` は改行を `\n` のままコピーすること
3. Deploy ボタンを押すだけ

---

## 画面構成

| ページ | URL | 説明 |
|--------|-----|------|
| 予想入力 | `/` | 名前・スコア・順位・得点王を入力 |
| ランキング | `/ranking` | ポイント順位表、各ユーザーの詳細へリンク |
| 予想詳細 | `/predict/[id]` | ポイント内訳・予想編集・変更履歴 |

---

## ポイントルール

### 日本戦スコア予想
| 条件 | ポイント |
|------|--------|
| 完全一致 | 10pt |
| 得失点差一致 | 3pt |
| 勝敗一致 | 1pt |

### 最終順位予想
| 順位 | 正解時 | 勝ち上がりボーナス |
|------|-------|-----------------|
| 1位 | 30pt | ベスト4以上:+5pt / ベスト8:+3pt / ベスト16:+1pt |
| 2位 | 20pt | 同上 |
| 3位 | 15pt | 同上 |
| 4位 | 10pt | 同上 |

### 得点王予想
得点王的中時: 予想ゴール数 × 2pt

---

## 編集ロックの仕組み

- 大会開始日時: **2026年6月11日 12:00 JST**（メキシコvsカナダ）
- クライアント側: 開始日時を過ぎると入力フォームが無効化
- サーバー側: APIで日時チェックし、ロック後の更新を `403` で拒否
- `/api/sync` 呼び出し時: Firestoreの未ロック予想を一括ロック (`locked: true`)

---

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/predictions` | 全予想一覧取得 |
| POST | `/api/predictions` | 予想作成・更新（ロックチェックあり） |
| GET | `/api/results` | 現在の試合結果取得 |
| GET | `/api/sync` | football-data.org から結果を同期 |
