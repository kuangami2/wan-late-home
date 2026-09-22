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

type DuskActivity = 'wind' | 'wreath' | 'story'

type AmbientWind = {
  context: AudioContext
  source: AudioBufferSourceNode
  gain: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
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

const flowers = [
  { name: '杏花', color: '#f0ae9f', symbol: '✿', note: '淡粉五瓣' },
  { name: '栀子', color: '#f3e9c9', symbol: '✽', note: '米白重瓣' },
  { name: '梅花', color: '#aec8ad', symbol: '❀', note: '青绿小花' },
  { name: '金盏', color: '#efb458', symbol: '✾', note: '金黄花心' },
  { name: '紫藤', color: '#c4a5c9', symbol: '✽', note: '浅紫花穗' },
]

const duskActivities: { id: DuskActivity; title: string; note: string; symbol: string }[] = [
  { id: 'wind', title: '听一会儿风', note: '不说话也很好', symbol: '≈' },
  { id: 'wreath', title: '交换花环', note: '把下午戴到天黑', symbol: '✿' },
  { id: 'story', title: '讲一件小事', note: '只讲给同行的人听', symbol: '∿' },
]

const shotsFor = (chosen: Companion, group: Companion[] = [], activity: DuskActivity = 'wind'): Shot[] => {
  const friend = companions.find((item) => item.id === chosen) ?? companions[1]
  const names = [chosen, ...group.filter((id) => id !== chosen)].map((id) => companions.find((item) => item.id === id)?.name).filter(Boolean) as string[]
  const groupLabel = names.length > 1 ? `${names.slice(0, -1).join('、')}和${names[names.length - 1]}` : friend.name
  const activityLine = duskActivities.find((item) => item.id === activity)?.title ?? '听一会儿风'
  return [
    { index: 1, title: '花枝擦过镜头', subtitle: '四个人从花田里走来，没人急着说话。', image: asset('flower-field.jpg'), duration: 5, movement: '前景花叶轻晃，镜头慢慢推近', sound: '风穿过草叶' },
    { index: 2, title: '手里的花环', subtitle: '青禾说：不用编得太整齐。', image: asset('garden-duo.jpg'), duration: 5, movement: '从花环移到笑起来的眼睛', sound: '衣料与花梗的细响' },
    { index: 3, title: '一颗青梅', subtitle: '酸意先到，笑声随后才来。', image: asset('forest-fruit.jpg'), duration: 4, movement: '手部特写，浅景深摇向树影', sound: '树上鸟鸣' },
    { index: 4, title: '有人回头', subtitle: `${friend.name}在喊你，夕阳已经落到肩上。`, image: friend.image, duration: 5, movement: '逆光中定格一个回头', sound: '远处溪水' },
    { index: 5, title: '坐到天快黑', subtitle: `你和${groupLabel}一起${activityLine}，谁也没有催谁。`, image: asset('lake-dusk.jpg'), duration: 6, movement: '从人物背影拉到湖面与山线', sound: '低声笛与晚风' },
    { index: 6, title: '晚些回去', subtitle: '把今天收好，明天还可以再打开。', image: asset('lake-dusk.jpg'), duration: 5, movement: '夕光压低，字幕慢慢浮现', sound: '风声渐远' },
  ]
}

function App() {
  const [chapterIndex, setChapterIndex] = useState(0)
  const [petals, setPetals] = useState<number[]>([])
  const [woven, setWoven] = useState<number[]>([])
  const [plumChoice, setPlumChoice] = useState<Companion | null>(null)
  const [companion, setCompanion] = useState<Companion | null>(null)
  const [duskFriends, setDuskFriends] = useState<Companion[]>([])
  const [duskActivity, setDuskActivity] = useState<DuskActivity | null>(null)
  const [isFinished, setIsFinished] = useState(false)
  const [isSoundOn, setIsSoundOn] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const ambientRef = useRef<AmbientWind | null>(null)
  const windStopTimerRef = useRef<number | null>(null)

  const current = chapters[chapterIndex]
  const progress = isFinished ? 100 : Math.round(((chapterIndex + (chapterIndex === 0 ? petals.length / 3 : chapterIndex === 1 ? woven.length / 4 : chapterIndex >= 2 ? 1 : 0)) / chapters.length) * 100)
  const selectedFriend = duskFriends[0] ?? companion ?? plumChoice ?? 'he'
  const selectedFriends = duskFriends.length > 0 ? duskFriends : [selectedFriend]
  const shots = useMemo(() => shotsFor(selectedFriend, selectedFriends, duskActivity ?? 'wind'), [selectedFriend, duskFriends, duskActivity])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linkedFriends = (params.get('friends') ?? params.get('friend') ?? '').split(',').filter((id): id is Companion => companions.some((item) => item.id === id))
    const linkedActivity = params.get('activity') as DuskActivity | null
    if (linkedFriends.length > 0) {
      setDuskFriends(linkedFriends)
      setCompanion(linkedFriends[0])
      if (linkedActivity && duskActivities.some((item) => item.id === linkedActivity)) setDuskActivity(linkedActivity)
      setIsFinished(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      const ambient = ambientRef.current
      if (ambient) {
        ambient.source.stop()
        ambient.lfo.stop()
        void ambient.context.close()
      }
      if (windStopTimerRef.current !== null) window.clearTimeout(windStopTimerRef.current)
    }
  }, [])

  useEffect(() => () => { if (exportUrl) URL.revokeObjectURL(exportUrl) }, [exportUrl])

  const toggleSound = () => {
    if (isSoundOn) {
      setIsSoundOn(false)
      const ambient = ambientRef.current
      if (ambient) {
        const now = ambient.context.currentTime
        ambient.gain.gain.cancelScheduledValues(now)
        ambient.gain.gain.setTargetAtTime(0.0001, now, 0.16)
        windStopTimerRef.current = window.setTimeout(() => {
          if (ambientRef.current !== ambient) return
          ambient.source.stop()
          ambient.lfo.stop()
          ambient.source.disconnect()
          ambient.lfo.disconnect()
          ambient.gain.disconnect()
          ambient.lfoGain.disconnect()
          ambientRef.current = null
          windStopTimerRef.current = null
          void ambient.context.close()
        }, 700)
      }
      return
    }
    const fadingAmbient = ambientRef.current
    if (fadingAmbient) {
      if (windStopTimerRef.current !== null) window.clearTimeout(windStopTimerRef.current)
      windStopTimerRef.current = null
      const now = fadingAmbient.context.currentTime
      fadingAmbient.gain.gain.cancelScheduledValues(now)
      fadingAmbient.gain.gain.setTargetAtTime(0.032, now, 0.35)
      setIsSoundOn(true)
      return
    }
    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    void context.resume()
    const bufferLength = context.sampleRate * 3
    const buffer = context.createBuffer(1, bufferLength, context.sampleRate)
    const noise = buffer.getChannelData(0)
    let previous = 0
    for (let index = 0; index < bufferLength; index += 1) {
      const white = Math.random() * 2 - 1
      previous = previous * 0.96 + white * 0.04
      noise[index] = previous * 3.2
    }
    const source = context.createBufferSource()
    const highpass = context.createBiquadFilter()
    const lowpass = context.createBiquadFilter()
    const gain = context.createGain()
    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    source.buffer = buffer
    source.loop = true
    highpass.type = 'highpass'
    highpass.frequency.value = 75
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 1450
    lowpass.Q.value = 0.35
    gain.gain.value = 0.0001
    lfo.frequency.value = 0.11
    lfoGain.gain.value = 0.008
    source.connect(highpass).connect(lowpass).connect(gain).connect(context.destination)
    lfo.connect(lfoGain).connect(gain.gain)
    source.start()
    lfo.start()
    gain.gain.setTargetAtTime(0.032, context.currentTime, 0.55)
    ambientRef.current = { context, source, gain, lfo, lfoGain }
    setIsSoundOn(true)
  }

  const nextChapter = () => {
    if (chapterIndex < chapters.length - 1) {
      setChapterIndex((value) => value + 1)
      return
    }
    setIsFinished(true)
    const friends = duskFriends.length > 0 ? duskFriends : [companion ?? plumChoice ?? 'he']
    window.history.replaceState({}, '', `${window.location.pathname}?friends=${friends.join(',')}&activity=${duskActivity ?? 'wind'}`)
  }

  const reset = () => {
    setChapterIndex(0)
    setPetals([])
    setWoven([])
    setPlumChoice(null)
    setCompanion(null)
    setDuskFriends([])
    setDuskActivity(null)
    setIsFinished(false)
    setExportUrl(null)
    window.history.replaceState({}, '', window.location.pathname)
  }

  const choosePlum = (id: Companion) => {
    setPlumChoice(id)
    setTimeout(nextChapter, 420)
  }

  const chooseDuskFriend = (id: Companion) => setDuskFriends((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const chooseDuskActivity = (id: DuskActivity) => setDuskActivity(id)
  const finishDusk = () => {
    const friends: Companion[] = duskFriends.length > 0 ? duskFriends : ['he']
    setDuskFriends(friends)
    setCompanion(friends[0])
    setIsFinished(true)
    window.history.replaceState({}, '', `${window.location.pathname}?friends=${friends.join(',')}&activity=${duskActivity ?? 'wind'}`)
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
    const metadata = shots.map((shot) => ({ ...shot, companions: selectedFriends.map((id) => companions.find((item) => item.id === id)?.name).filter(Boolean), activity: duskActivity ?? 'wind' }))
    zip.file('storyboard.json', JSON.stringify({ title: '晚些回去', companions: selectedFriends, activity: duskActivity ?? 'wind', shots: metadata }, null, 2))
    zip.file('storyboard.csv', `\ufeff序号,镜头,字幕,时长(秒),运镜,声音\n${shots.map((shot) => `${shot.index},${shot.title},${shot.subtitle},${shot.duration},${shot.movement},${shot.sound}`).join('\n')}`)
    zip.file('subtitles.srt', shots.map((shot, index) => `${String(index + 1).padStart(2, '0')}\n${timecode(shots.slice(0, index).reduce((sum, item) => sum + item.duration, 0))} --> ${timecode(shots.slice(0, index + 1).reduce((sum, item) => sum + item.duration, 0))}\n${shot.subtitle}\n`).join('\n'))
    zip.file('README.txt', '《晚些回去》短视频分镜包\n横屏与竖屏各六张 JPG。字幕、镜头运动和声音提示见 storyboard.csv / storyboard.json。\n素材由互动游记根据同行选择整理。')
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
    setExportUrl(URL.createObjectURL(blob))
    setExporting(false)
  }

  if (isFinished) {
    return <FinishScreen companions={selectedFriends} activity={duskActivity ?? 'wind'} shots={shots} exporting={exporting} exportUrl={exportUrl} onExport={exportStoryboard} onReset={reset} />
  }

  return (
    <main className="app-shell" style={{ '--chapter-tint': current.tint } as CSSProperties}>
      <div className="grain" aria-hidden="true" />
      <section className="scene" style={{ backgroundImage: `url(${current.image})` }}>
        <div className="scene-shade" />
        <header className="topbar">
          <button className="wordmark" onClick={reset} aria-label="回到开头"><span>花朝</span><strong>晚些回去</strong></button>
          <div className="top-actions">
            <button className="quiet-button" onClick={toggleSound} aria-pressed={isSoundOn}><span className="sound-dot" />{isSoundOn ? '环境声已开' : '打开环境声'}</button>
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
          <Interaction chapter={chapterIndex} petals={petals} woven={woven} plumChoice={plumChoice} duskFriends={duskFriends} duskActivity={duskActivity} onPetal={(index) => setPetals((items) => items.includes(index) ? items : [...items, index])} onWoven={(index) => setWoven((items) => items.includes(index) ? items : [...items, index])} onPlum={choosePlum} onDuskFriend={chooseDuskFriend} onDuskActivity={chooseDuskActivity} onFinishDusk={finishDusk} onAdvance={nextChapter} />
        </div>

        <div className="scene-footer"><span>一段关于花、朋友和落日的古风互动游记</span><span>{String(chapterIndex + 1).padStart(2, '0')} / 04</span></div>
      </section>
    </main>
  )
}

function Interaction({ chapter, petals, woven, plumChoice, duskFriends, duskActivity, onPetal, onWoven, onPlum, onDuskFriend, onDuskActivity, onFinishDusk, onAdvance }: { chapter: number; petals: number[]; woven: number[]; plumChoice: Companion | null; duskFriends: Companion[]; duskActivity: DuskActivity | null; onPetal: (index: number) => void; onWoven: (index: number) => void; onPlum: (id: Companion) => void; onDuskFriend: (id: Companion) => void; onDuskActivity: (id: DuskActivity) => void; onFinishDusk: () => void; onAdvance: () => void }) {
  if (chapter === 0) return <div className="interaction"><p className="prompt"><span>✦</span> 找到三朵愿意同行的花 <em>{petals.length} / 3</em></p><div className="petal-field">{flowers.map((flower, item) => <button key={flower.name} className={`petal petal-${item} ${petals.includes(item) ? 'picked' : ''}`} style={{ color: flower.color }} onClick={() => onPetal(item)} aria-label={`采下${flower.name}`}><span>{flower.symbol}</span><small>{flower.name}</small></button>)}</div><div className="flower-legend">{flowers.map((flower) => <span key={flower.name}><i style={{ background: flower.color }} />{flower.name}</span>)}</div><button className="next-button" disabled={petals.length < 3} onClick={onAdvance}>{petals.length < 3 ? '再找一朵' : '带着花，继续走'} <span>↗</span></button></div>
  if (chapter === 1) return <div className="interaction"><p className="prompt"><span>✦</span> 点选花材，把花环慢慢编好 <em>{woven.length} / 4</em></p><div className="wreath-board"><div className="wreath-ring">{[0, 1, 2, 3].map((item) => { const flowerIndex = petals[item % Math.max(petals.length, 1)] ?? item; const flower = flowers[flowerIndex]; return <button key={item} className={`wreath-slot slot-${item} ${woven.includes(item) ? 'filled' : ''}`} style={woven.includes(item) ? { background: flower.color, borderColor: flower.color } : undefined} onClick={() => onWoven(item)} aria-label={woven.includes(item) ? `${flower.name}花环位置` : '放入花材'}>{woven.includes(item) ? flower.symbol : '+'}</button> })}</div></div><div className="wreath-legend">{flowers.map((flower) => <span key={flower.name}><i style={{ background: flower.color }} />{flower.name}</span>)}</div><button className="next-button" disabled={woven.length < 4} onClick={onAdvance}>{woven.length < 4 ? '花环还差一点' : '戴上花环，去林下'} <span>↗</span></button></div>
  if (chapter === 2) return <div className="interaction"><p className="prompt"><span>✦</span> 这一颗青梅，给谁？</p><div className="friend-row">{companions.map((friend) => <button key={friend.id} className={`friend-card ${plumChoice === friend.id ? 'chosen' : ''}`} onClick={() => onPlum(friend.id)}><span className="avatar" style={{ backgroundImage: `url(${friend.image})` }} /><span><strong>{friend.name}</strong><small>{friend.note}</small></span><i>↗</i></button>)}</div></div>
  return <div className="interaction"><p className="prompt"><span>✦</span> 和谁一起等夕阳？可多选同行的人</p><div className="friend-row final-row">{companions.map((friend) => <button key={friend.id} className={`friend-card large-friend-card ${duskFriends.includes(friend.id) ? 'chosen' : ''}`} onClick={() => onDuskFriend(friend.id)}><span className="avatar" style={{ backgroundImage: `url(${friend.image})` }} /><span><strong>{friend.name}</strong><small>{friend.note}</small></span><i>{duskFriends.includes(friend.id) ? '✓' : '+'}</i></button>)}</div><div className="activity-row">{duskActivities.map((item) => <button key={item.id} className={`activity-card ${duskActivity === item.id ? 'chosen' : ''}`} onClick={() => onDuskActivity(item.id)}><b>{item.symbol}</b><span><strong>{item.title}</strong><small>{item.note}</small></span></button>)}</div><button className="next-button" disabled={duskFriends.length === 0 || !duskActivity} onClick={onFinishDusk}>{duskFriends.length === 0 ? '先选同行的人' : !duskActivity ? '再选一件小事' : '坐到天快黑'} <span>↗</span></button></div>
}

function FinishScreen({ companions: selectedCompanions, activity, shots, exporting, exportUrl, onExport, onReset }: { companions: Companion[]; activity: DuskActivity; shots: Shot[]; exporting: boolean; exportUrl: string | null; onExport: () => void; onReset: () => void }) {
  const names = selectedCompanions.map((id) => companions.find((item) => item.id === id)?.name).filter(Boolean) as string[]
  const groupLabel = names.length > 1 ? `${names.slice(0, -1).join('、')}和${names[names.length - 1]}` : names[0] ?? '青禾'
  const activityName = duskActivities.find((item) => item.id === activity)?.title ?? '听一会儿风'
  return <main className="finish-shell"><div className="grain" aria-hidden="true" /><header className="topbar finish-top"><button className="wordmark" onClick={onReset}><span>花朝</span><strong>晚些回去</strong></button><span className="finish-tag">游记完成 · {groupLabel}</span></header><div className="finish-grid"><section className="finish-copy"><div className="chapter-kicker"><span className="sun-mark" />你的花朝游记已经写好</div><h1>晚些回去，<br /><i>也没有关系。</i></h1><p>你和{groupLabel}{activityName}到了天快黑。六个片刻已经被收进一份可以继续拍下去的分镜。</p><div className="finish-actions">{exportUrl ? <a className="primary-action" href={exportUrl} download="wan-late-home-storyboard.zip">保存双版分镜包 <span>↓</span></a> : <button className="primary-action" onClick={onExport} disabled={exporting}>{exporting ? '正在整理六个片刻…' : '整理我的双版分镜包'} <span>{exporting ? '·' : '↓'}</span></button>}<button className="secondary-action" onClick={onReset}>再走一遍 <span>↗</span></button></div><div className="share-note">{selectedCompanions.length} 位同行者 · {activityName} · 横竖双版 6 镜头<br />链接中保存了你的同行选择，可分享给朋友。</div></section><section className="storyboard-preview"><div className="preview-label"><span>分镜预览</span><span>01 — 06</span></div><div className="shot-stack">{shots.slice(0, 3).map((shot, index) => <div className={`shot-card shot-${index}`} key={shot.index} style={{ backgroundImage: `url(${shot.image})` }}><span>0{shot.index}</span><strong>{shot.title}</strong></div>)}</div><div className="preview-bottom">风从花梢里穿过去<br /><em>大家便都慢下来。</em></div></section></div></main>
}

function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.crossOrigin = 'anonymous'; image.onload = () => resolve(image); image.onerror = reject; image.src = src }) }
function renderCrop(image: HTMLImageElement, width: number, height: number, vertical: boolean) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d')!; const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight); const drawWidth = image.naturalWidth * scale; const drawHeight = image.naturalHeight * scale; const x = (width - drawWidth) / 2 + (vertical ? drawWidth * 0.03 : 0); const y = (height - drawHeight) / 2; ctx.filter = 'saturate(0.92) contrast(1.03)'; ctx.drawImage(image, x, y, drawWidth, drawHeight); return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.86)) }
async function blobToArrayBuffer(blob: Blob) { return await blob.arrayBuffer() }
function timecode(seconds: number) { const minutes = Math.floor(seconds / 60); const remainder = seconds % 60; return `00:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')},000` }

export default App

createRoot(document.getElementById('root')!).render(<App />)
