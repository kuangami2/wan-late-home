import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import JSZip from 'jszip'
import './styles.css'

type Companion = 'tang' | 'he' | 'xi'

type Chapter = {
  id: string
  chapter: string
  title: string
  eyebrow: string
  line: string
  prompt: string
  image: string
  tint: string
}

type Shot = {
  index: number
  title: string
  subtitle: string
  image: string
  duration: number
  movement: string
  sound: string
}

const base = import.meta.env.BASE_URL
const asset = (name: string) => `${base}assets/${name}`

const chapters: Chapter[] = [
  {
    id: 'flower',
    chapter: '一 / 遇花',
    title: '先别走，花还没看完',
    eyebrow: '花田 · 午后四时',
    line: '风从花梢里穿过去，大家便都慢下来。',
    prompt: '在花田里找到三朵愿意同行的花',
    image: asset('flower-field.jpg'),
    tint: '#c77a35',
  },
  {
    id: 'wreath',
    chapter: '二 / 编环',
    title: '把今天编在一起',
    eyebrow: '花田 · 风变轻了',
    line: '青禾说，花环不用对称，像我们这样就很好。',
    prompt: '点选花材，把花环慢慢编好',
    image: asset('garden-duo.jpg'),
    tint: '#d99a8d',
  },
  {
    id: 'plum',
    chapter: '三 / 分梅',
    title: '这一颗，给谁？',
    eyebrow: '林下 · 日影西斜',
    line: '一颗青梅在掌心滚了滚，甜味还没有决定去处。',
    prompt: '把青梅递给一位朋友',
    image: asset('forest-fruit.jpg'),
    tint: '#f2b55b',
  },
  {
    id: 'dusk',
    chapter: '四 / 等夕阳',
    title: '再坐一会儿',
    eyebrow: '湖畔 · 天快黑了',
    line: '回去也没有什么要紧的事。你想和谁并肩？',
    prompt: '选择一位朋友，一起看完落日',
    image: asset('lake-dusk.jpg'),
    tint: '#7e9bae',
  },
]

const companions: { id: Companion; name: string; note: string; color: string; image: string }[] = [
  { id: 'tang', name: '阿棠', note: '把寻常小事讲得有趣', color: '#d99a8d', image: asset('flower-field.jpg') },
  { id: 'he', name: '青禾', note: '手很巧，会把花编得刚刚好', color: '#849f89', image: asset('garden-duo.jpg') },
  { id: 'xi', name: '闻溪', note: '总是先听见风和鸟鸣', color: '#96aebe', image: asset('forest-fruit.jpg') },
]

const shotsFor = (chosen: Companion): Shot[] => {
  const friend = companions.find((item) => item.id === chosen) ?? companions[1]
  return [
    { index: 1, title: '花枝擦过镜头', subtitle: '四个人从花田里走来，没人急着说话。', image: asset('flower-field.jpg'), duration: 5, movement: '前景花叶轻晃，镜头慢慢推近', sound: '风穿过草叶' },
    { index: 2, title: '手里的花环', subtitle: '青禾说：不用编得太整齐。', image: asset('garden-duo.jpg'), duration: 5, movement: '从花环移到笑起来的眼睛', sound: '衣料与花梗的细响' },
    { index: 3, title: '一颗青梅', subtitle: '酸意先到，笑声随后才来。', image: asset('forest-fruit.jpg'), duration: 4, movement: '手部特写，浅景深摇向树影', sound: '树上鸟鸣' },
    { index: 4, title: '有人回头', subtitle: `${friend.name}在喊你，夕阳已经落到肩上。`, image: friend.image, duration: 5, movement: '逆光中定格一个回头', sound: '远处溪水' },
    { index: 5, title: '坐到天快黑', subtitle: `你和${friend.name}并肩坐下，谁也没有催谁。`, image: asset('lake-dusk.jpg'), duration: 6, movement: '从人物背影拉到湖面与山线', sound: '低声笛与晚风' },
    { index: 6, title: '晚些回去', subtitle: '把今天收好，明天还可以再打开。', image: asset('lake-dusk.jpg'), duration: 5, movement: '夕光压低，字幕慢慢浮现', sound: '风声渐远' },
  ]
}

function App() {
  const [chapterIndex, setChapterIndex] = useState(0)
  const [petals, setPetals] = useState<number[]>([])
  const [woven, setWoven] = useState<number[]>([])
  const [plumChoice, setPlumChoice] = useState<Companion | null>(null)
  const [companion, setCompanion] = useState<Companion | null>(null)
  const [isFinished, setIsFinished] = useState(false)
  const [isSoundOn, setIsSoundOn] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const current = chapters[chapterIndex]
  const progress = isFinished ? 100 : Math.round(((chapterIndex + (chapterIndex === 0 ? petals.length / 3 : chapterIndex === 1 ? woven.length / 4 : chapterIndex >= 2 ? 1 : 0)) / chapters.length) * 100)
  const selectedFriend = companion ?? plumChoice ?? 'he'
  const shots = useMemo(() => shotsFor(selectedFriend), [selectedFriend])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromLink = params.get('friend') as Companion | null
    if (fromLink && companions.some((item) => item.id === fromLink)) {
      setCompanion(fromLink)
      setIsFinished(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioRef.current) void audioRef.current.close()
      if (exportUrl) URL.revokeObjectURL(exportUrl)
    }
  }, [exportUrl])

  const toggleSound = () => {
    if (isSoundOn) {
      setIsSoundOn(false)
      if (audioRef.current) void audioRef.current.suspend()
      return
    }
    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const context = audioRef.current ?? new AudioContextCtor()
    audioRef.current = context
    void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 196
    gain.gain.value = 0.018
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    setIsSoundOn(true)
  }

  const nextChapter = () => {
    if (chapterIndex < chapters.length - 1) {
      setChapterIndex((value) => value + 1)
      return
    }
    setIsFinished(true)
    window.history.replaceState({}, '', `${window.location.pathname}?friend=${companion ?? plumChoice ?? 'he'}`)
  }

  const reset = () => {
    setChapterIndex(0)
    setPetals([])
    setWoven([])
    setPlumChoice(null)
    setCompanion(null)
    setIsFinished(false)
    setExportUrl(null)
    window.history.replaceState({}, '', window.location.pathname)
  }

  const choosePlum = (id: Companion) => {
    setPlumChoice(id)
    setTimeout(nextChapter, 420)
  }

  const chooseCompanion = (id: Companion) => {
    setCompanion(id)
    setTimeout(() => {
      setIsFinished(true)
      window.history.replaceState({}, '', `${window.location.pathname}?friend=${id}`)
    }, 420)
  }

  const exportStoryboard = async () => {
    setExporting(true)
    if (exportUrl) URL.revokeObjectURL(exportUrl)
    const zip = new JSZip()
    const imageFolder = zip.folder('images')
    for (const shot of shots) {
      const image = await loadImage(shot.image)
      const horizontal = renderCrop(image, 1920, 1080, false)
      const vertical = renderCrop(image, 1080, 1920, true)
      imageFolder?.file(`horizontal-${String(shot.index).padStart(2, '0')}.jpg`, await blobToArrayBuffer(await horizontal))
      imageFolder?.file(`vertical-${String(shot.index).padStart(2, '0')}.jpg`, await blobToArrayBuffer(await vertical))
    }
    const metadata = shots.map((shot) => ({ ...shot, companion: companions.find((item) => item.id === selectedFriend)?.name }))
    zip.file('storyboard.json', JSON.stringify({ title: '晚些回去', companion: selectedFriend, shots: metadata }, null, 2))
    zip.file('storyboard.csv', `\ufeff序号,镜头,字幕,时长(秒),运镜,声音\n${shots.map((shot) => `${shot.index},${shot.title},${shot.subtitle},${shot.duration},${shot.movement},${shot.sound}`).join('\n')}`)
    zip.file('subtitles.srt', shots.map((shot, index) => `${String(index + 1).padStart(2, '0')}\n${timecode(shots.slice(0, index).reduce((sum, item) => sum + item.duration, 0))} --> ${timecode(shots.slice(0, index + 1).reduce((sum, item) => sum + item.duration, 0))}\n${shot.subtitle}\n`).join('\n'))
    zip.file('README.txt', '《晚些回去》短视频分镜包\n横屏与竖屏各六张 JPG。字幕、镜头运动和声音提示见 storyboard.csv / storyboard.json。\n素材由互动游记根据同行选择整理。')
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
    setExportUrl(URL.createObjectURL(blob))
    setExporting(false)
  }

  if (isFinished) {
    return <FinishScreen companion={selectedFriend} shots={shots} exporting={exporting} exportUrl={exportUrl} onExport={exportStoryboard} onReset={reset} />
  }

  return (
    <main className="app-shell" style={{ '--chapter-tint': current.tint } as CSSProperties}>
      <div className="grain" aria-hidden="true" />
      <section className="scene" style={{ backgroundImage: `url(${current.image})` }}>
        <div className="scene-shade" />
        <header className="topbar">
          <button className="wordmark" onClick={reset} aria-label="回到开头"><span>花朝</span><strong>晚些回去</strong></button>
          <div className="top-actions">
            <button className="quiet-button" onClick={toggleSound} aria-pressed={isSoundOn}><span className="sound-dot" />{isSoundOn ? '风声已开' : '打开风声'}</button>
            <button className="quiet-button" onClick={reset}>重新游历</button>
          </div>
        </header>

        <aside className="chapter-rail" aria-label="游记章节">
          <div className="rail-label">游记进度</div>
          {chapters.map((item, index) => <button key={item.id} className={`chapter-marker ${index === chapterIndex ? 'active' : ''} ${index < chapterIndex ? 'done' : ''}`} onClick={() => index <= chapterIndex && setChapterIndex(index)}><span>0{index + 1}</span><i>{item.chapter.split(' / ')[1]}</i></button>)}
          <div className="rail-line"><span style={{ height: `${progress}%` }} /></div>
        </aside>

        <div className="scene-copy">
          <div className="chapter-kicker"><span className="sun-mark" />{current.eyebrow}</div>
          <div className="chapter-count">{current.chapter}</div>
          <h1>{current.title}</h1>
          <p className="scene-line">{current.line}</p>
          <Interaction chapter={chapterIndex} petals={petals} woven={woven} plumChoice={plumChoice} companion={companion} onPetal={(index) => setPetals((items) => items.includes(index) ? items : [...items, index])} onWoven={(index) => setWoven((items) => items.includes(index) ? items : [...items, index])} onPlum={choosePlum} onCompanion={chooseCompanion} onAdvance={nextChapter} />
        </div>

        <div className="scene-footer"><span>一段关于花、朋友和落日的古风互动游记</span><span>{String(chapterIndex + 1).padStart(2, '0')} / 04</span></div>
      </section>
    </main>
  )
}

function Interaction({ chapter, petals, woven, plumChoice, companion, onPetal, onWoven, onPlum, onCompanion, onAdvance }: { chapter: number; petals: number[]; woven: number[]; plumChoice: Companion | null; companion: Companion | null; onPetal: (index: number) => void; onWoven: (index: number) => void; onPlum: (id: Companion) => void; onCompanion: (id: Companion) => void; onAdvance: () => void }) {
  if (chapter === 0) return <div className="interaction"><p className="prompt"><span>✦</span> 找到三朵愿意同行的花 <em>{petals.length} / 3</em></p><div className="petal-field">{[0, 1, 2, 3, 4].map((item) => <button key={item} className={`petal petal-${item} ${petals.includes(item) ? 'picked' : ''}`} onClick={() => onPetal(item)} aria-label={`采下第${item + 1}朵花`}><span>✿</span></button>)}</div><button className="next-button" disabled={petals.length < 3} onClick={onAdvance}>{petals.length < 3 ? '再找一朵' : '带着花，继续走'} <span>↗</span></button></div>
  if (chapter === 1) return <div className="interaction"><p className="prompt"><span>✦</span> 点选花材，把花环慢慢编好 <em>{woven.length} / 4</em></p><div className="wreath-board"><div className="wreath-ring">{[0, 1, 2, 3].map((item) => <button key={item} className={`wreath-slot slot-${item} ${woven.includes(item) ? 'filled' : ''}`} onClick={() => onWoven(item)}>{woven.includes(item) ? ['杏', '青', '白', '粉'][item] : '+'}</button>)}</div></div><button className="next-button" disabled={woven.length < 4} onClick={onAdvance}>{woven.length < 4 ? '花环还差一点' : '戴上花环，去林下'} <span>↗</span></button></div>
  if (chapter === 2) return <div className="interaction"><p className="prompt"><span>✦</span> 这一颗青梅，给谁？</p><div className="friend-row">{companions.map((friend) => <button key={friend.id} className={`friend-card ${plumChoice === friend.id ? 'chosen' : ''}`} onClick={() => onPlum(friend.id)}><span className="avatar" style={{ backgroundImage: `url(${friend.image})` }} /><span><strong>{friend.name}</strong><small>{friend.note}</small></span><i>↗</i></button>)}</div></div>
  return <div className="interaction"><p className="prompt"><span>✦</span> 选一个人，再陪他坐一会儿</p><div className="friend-row final-row">{companions.map((friend) => <button key={friend.id} className={`friend-card ${companion === friend.id ? 'chosen' : ''}`} onClick={() => onCompanion(friend.id)}><span className="avatar" style={{ backgroundImage: `url(${friend.image})` }} /><span><strong>{friend.name}</strong><small>{friend.note}</small></span><i>{companion === friend.id ? '✓' : '↗'}</i></button>)}</div></div>
}

function FinishScreen({ companion, shots, exporting, exportUrl, onExport, onReset }: { companion: Companion; shots: Shot[]; exporting: boolean; exportUrl: string | null; onExport: () => void; onReset: () => void }) {
  const friend = companions.find((item) => item.id === companion) ?? companions[1]
  return <main className="finish-shell"><div className="grain" aria-hidden="true" /><header className="topbar finish-top"><button className="wordmark" onClick={onReset}><span>花朝</span><strong>晚些回去</strong></button><span className="finish-tag">游记完成 · {friend.name}</span></header><div className="finish-grid"><section className="finish-copy"><div className="chapter-kicker"><span className="sun-mark" />你的花朝游记已经写好</div><h1>晚些回去，<br /><i>也没有关系。</i></h1><p>你和{friend.name}并肩坐到了天快黑。六个片刻已经被收进一份可以继续拍下去的分镜。</p><div className="finish-actions">{exportUrl ? <a className="primary-action" href={exportUrl} download="wan-late-home-storyboard.zip">保存双版分镜包 <span>↓</span></a> : <button className="primary-action" onClick={onExport} disabled={exporting}>{exporting ? '正在整理六个片刻…' : '整理我的双版分镜包'} <span>{exporting ? '·' : '↓'}</span></button>}<button className="secondary-action" onClick={onReset}>再走一遍 <span>↗</span></button></div><div className="share-note">横屏与竖屏 · 6 个镜头 · 字幕与声音提示<br />链接中保存了你的同行选择，可分享给朋友。</div></section><section className="storyboard-preview"><div className="preview-label"><span>分镜预览</span><span>01 — 06</span></div><div className="shot-stack">{shots.slice(0, 3).map((shot, index) => <div className={`shot-card shot-${index}`} key={shot.index} style={{ backgroundImage: `url(${shot.image})` }}><span>0{shot.index}</span><strong>{shot.title}</strong></div>)}</div><div className="preview-bottom">风从花梢里穿过去<br /><em>大家便都慢下来。</em></div></section></div></main>
}

function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.crossOrigin = 'anonymous'; image.onload = () => resolve(image); image.onerror = reject; image.src = src }) }
function renderCrop(image: HTMLImageElement, width: number, height: number, vertical: boolean) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d')!; const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight); const drawWidth = image.naturalWidth * scale; const drawHeight = image.naturalHeight * scale; const x = (width - drawWidth) / 2 + (vertical ? drawWidth * 0.03 : 0); const y = (height - drawHeight) / 2; ctx.filter = 'saturate(0.92) contrast(1.03)'; ctx.drawImage(image, x, y, drawWidth, drawHeight); return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.86)) }
async function blobToArrayBuffer(blob: Blob) { return await blob.arrayBuffer() }
function timecode(seconds: number) { const minutes = Math.floor(seconds / 60); const remainder = seconds % 60; return `00:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')},000` }

export default App

createRoot(document.getElementById('root')!).render(<App />)
