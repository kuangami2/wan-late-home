# 《晚些回去》

一个双端响应式的古风互动游记原型：采花、编环、分梅，再与一位朋友坐到天快黑。结尾会根据同行选择生成横屏与竖屏双版短视频分镜 ZIP。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 部署

这是一个静态 Vite 项目，构建产物在 `dist/`。可直接导入 Vercel、Netlify 或任意静态托管服务，构建命令为 `npm run build`，发布目录为 `dist`。

当前素材目录中的四张图是用户提供的参考图副本，用于可玩原型和风格验证。它们包含原参考中的字幕、水印或黑边；正式发布前，应将 `public/assets/` 替换为无文字、无水印的原创生成素材，文件名保持不变即可。

## 分镜导出

导出在浏览器内完成，不需要业务后端。ZIP 包含：

- `images/`：六张横屏和六张竖屏 JPG
- `storyboard.json`
- `storyboard.csv`
- `subtitles.srt`
- `README.txt`

生成接口没有写入前端；正式素材应在制作环境中调用图像 API 生成并复制到 `public/assets/`，不要将 API 密钥放入网页代码。

## 视觉约束

墨青 `#0B2630`、米白 `#F3EBDD`、暖琥珀 `#C77A35`、金橙 `#F2B55B`，配合青蓝阴影、浅景深和前景花叶。人物与服饰连续性应以同一组定妆参考锁定。
