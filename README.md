# Line78

第78回灘校文化祭「ODYSSEY」にて、LINE公式アカウントのDMのやり取りを効率化するために作成。

LINE公式アカウントの操作画面では、大人数に対し対応をすることが難しい。

よって、LINEで来たDMに対し、Discordチャンネルでそれぞれのユーザーのスレッドを作成し、複数人で円滑に対応できるようにする。

## フロー

1. ユーザーがLINE公式アカウントに対し、「質問」と送信する。
2. WebhookによりユーザーID、チャンネルIDを取得する。
3. Discord上でスレッドを作成し、チャンネル名にユーザーID、チャンネルIDを記載する。

## 環境変数について

https://developers.line.biz/ja/reference/messaging-api/#issue-shortlived-channel-access-token

に従ってCHANNEL_ACCESS_TOKENを取得する。
