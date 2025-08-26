import { formatSecondsToClock } from '@renderer/utils/time'
import React from 'react'
import { createFileRoute, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useInterval, useKeyPress, useDebounceFn } from 'ahooks'
import { Progress, Tooltip } from 'antd'
import { useStore } from '@renderer/store/store'
import clsx from 'clsx'

// --- 抽象：用于显示后自动消失的提示框 ---
function useHint<T>() {
  const [hint, setHint] = useState<{ data: T; key: number } | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showHint = (data: T) => {
    setHint({ data, key: Date.now() })

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置3秒后自动隐藏
    timeoutRef.current = setTimeout(() => {
      setHint(null)
    }, 3000)
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [hint, showHint] as const
}

const Hint = <T,>({
  hint,
  className,
  children
}: {
  hint: { data: T; key: number } | null
  className: string
  children: (data: T) => React.ReactNode
}) => {
  if (!hint) return null

  return (
    <div
      key={hint.key}
      className={clsx(
        'absolute bg-gray-900/80 text-gray-100 rounded-xl animate-fade-in-out z-20 backdrop-blur-sm border border-gray-700/50',
        className
      )}
    >
      {children(hint.data)}
    </div>
  )
}

// --- 辅助函数 ---
function playNotificationSound(): void {
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.connect(gain)
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.connect(context.destination)
  gain.gain.setValueAtTime(0, context.currentTime)
  gain.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.05)
  oscillator.start(context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 1)
  oscillator.stop(context.currentTime + 1)
}

// --- 跨平台修饰键检测 ---
const getPlatformInfo = () => {
  if (typeof navigator === 'undefined') return { isMac: false }

  const platform = navigator.platform.toUpperCase()
  const userAgent = navigator.userAgent.toUpperCase()

  const isMac =
    platform.indexOf('MAC') >= 0 ||
    userAgent.indexOf('MAC OS') >= 0 ||
    userAgent.indexOf('MACINTOSH') >= 0

  return { isMac }
}

const { isMac } = getPlatformInfo()
const modifierKey = isMac ? 'metaKey' : 'ctrlKey'
const modifierKeyDisplay = isMac ? 'Cmd' : 'Ctrl'

// --- 专注模式主组件 ---
function Focus(): React.JSX.Element {
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // --- 全局状态 ---
  const { learningRecording, phases, currentPhaseIndex, timeLeft, isTimerRunning } = useStore()
  const { startFocus, tick, resetFocus, updateRecordingLearningRecord } = useStore((s) => s.actions)

  // --- 本地 UI 状态 ---
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [volumeHint, showVolumeHint] = useHint<number>()
  const [seekHint, showSeekHint] = useHint<string>()
  const [speedHint, showSpeedHint] = useHint<string>()
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isCursorVisible, setIsCursorVisible] = useState(true)
  const [phaseKey, setPhaseKey] = useState(0)
  const [progressHover, setProgressHover] = useState<{ x: number; y: number; time: string } | null>(
    null
  )
  const [sessionStartTime] = useState(Date.now())
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)

  const isExiting = useRef(false)

  // --- 5秒后隐藏操作提示的防抖函数 ---
  const { run: hideControlsDebounced } = useDebounceFn(
    () => {
      setIsControlsVisible(false)
    },
    { wait: 5000 }
  )

  // --- 3秒后隐藏鼠标指针的防抖函数 ---
  const { run: hideCursorDebounced } = useDebounceFn(
    () => {
      setIsCursorVisible(false)
    },
    { wait: 3000 }
  )

  // --- 事件处理 ---

  const router = useRouter()
  const canGoBack = useCanGoBack()

  const handleGlobalMouseMove = () => {
    setIsControlsVisible(true)
    setIsCursorVisible(true)
    hideControlsDebounced()
    hideCursorDebounced()
  }

  const handleExitFullscreen = useCallback((): void => {
    if (isExiting.current) return
    isExiting.current = true

    if (learningRecording) {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000)
      updateRecordingLearningRecord(learningRecording.path, sessionDuration, sessionStartTime)
    }
    window.api.exitFullscreen()
    if (canGoBack) {
      router.history.back()
    }
  }, [learningRecording, sessionStartTime, updateRecordingLearningRecord, canGoBack, router.history])

  const handlePlayPause = (): void => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(console.error)
    } else {
      audio.pause()
    }
  }

  const handleSeek = (offset: number): void => {
    if (audioRef.current) {
      audioRef.current.currentTime += offset
      showSeekHint(offset > 0 ? '快进 3秒' : '后退 3秒')
    }
  }

  const handleSystemVolumeChange = async (direction: 'up' | 'down'): Promise<void> => {
    const newVolume = await window.api.changeSystemVolume(direction)
    if (newVolume >= 0) {
      showVolumeHint(newVolume)
    }
  }

  const handleSpeedChange = (direction: 'up' | 'down'): void => {
    setPlaybackSpeed((prevSpeed) => {
      let newSpeed = prevSpeed
      if (direction === 'up' && prevSpeed < 2) {
        newSpeed = Math.min(2, prevSpeed + 0.25)
      } else if (direction === 'down' && prevSpeed > 0.25) {
        newSpeed = Math.max(0.25, prevSpeed - 0.25)
      }

      if (newSpeed !== prevSpeed) {
        showSpeedHint(`倍速: ${newSpeed}x`)
      }

      return newSpeed
    })
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const audio = audioRef.current
    const progressBar = progressBarRef.current
    if (!audio || !audio.duration || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    audio.currentTime = audio.duration * percentage
  }

  const handleFooterMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const audio = audioRef.current
    const progressBar = progressBarRef.current
    if (!audio || !audio.duration || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    const hoverTime = Math.floor(audio.duration * percentage)

    setProgressHover({
      x: e.clientX,
      y: e.clientY,
      time: formatSecondsToClock(hoverTime)
    })
  }

  // --- 副作用 ---

  // 初始化和清理
  useEffect(() => {
    if (!learningRecording || phases.length === 0) {
      navigate({ to: '/' })
      return
    }
    window.api.enterFullscreen()
    startFocus()
    hideControlsDebounced() // 初始时启动控制提示隐藏计时器
    hideCursorDebounced() // 初始时启动鼠标隐藏计时器

    window.api.getAudioDataUrl(learningRecording.path).then((url) => {
      if (url) {
        setAudioDataUrl(url)
      } else {
        navigate({ to: '/' })
      }
    })

    return () => {
      resetFocus()
      window.api.exitFullscreen()
    }
  }, [
    learningRecording,
    navigate,
    startFocus,
    resetFocus,
    phases.length,
    hideControlsDebounced,
    hideCursorDebounced
  ])

  // 计时器
  useInterval(() => {
    if (isTimerRunning) {
      if (timeLeft <= 1 && timeLeft > 0) {
        playNotificationSound()
      }
      tick()
    }
  }, 1000)

  // 阶段切换逻辑
  useEffect(() => {
    if (phases.length === 0) return

    const currentPhase = phases[currentPhaseIndex]
    if (!currentPhase) return

    // 如果是结束阶段，则直接退出
    if (currentPhase.type === '结束') {
      handleExitFullscreen()
      return
    }

    setPhaseKey((k) => k + 1)
    const audio = audioRef.current
    if (!audio) return

    switch (currentPhase.type) {
      case '学习':
        if (audio.paused) audio.play().catch(console.error)
        break
      case '休息':
        if (!audio.paused) audio.pause()
        break
    }
  }, [currentPhaseIndex, phases, handleExitFullscreen])

  // 音频进度更新
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => {
      if (audio.duration > 0) {
        setAudioProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    audio.addEventListener('timeupdate', updateProgress)
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
    }
  }, [audioDataUrl])

  // 音频倍速同步
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // --- 快捷键 ---
  useKeyPress('space', handlePlayPause, { exactMatch: true })
  useKeyPress('uparrow', () => handleSystemVolumeChange('up'))
  useKeyPress('downarrow', () => handleSystemVolumeChange('down'))
  useKeyPress('leftarrow', (event) => {
    if (event[modifierKey as keyof KeyboardEvent]) {
      handleSpeedChange('down')
    } else {
      handleSeek(-3)
    }
  })
  useKeyPress('rightarrow', (event) => {
    if (event[modifierKey as keyof KeyboardEvent]) {
      handleSpeedChange('up')
    } else {
      handleSeek(3)
    }
  })
  useKeyPress('esc', handleExitFullscreen)

  // --- 渲染计算 ---
  const currentPhase = phases[currentPhaseIndex]
  if (!currentPhase) return <> </>

  return (
    <div
      ref={fullscreenContainerRef}
      className={clsx(
        'h-screen w-screen flex flex-col relative overflow-hidden select-none',
        'bg-gradient-to-br from-slate-900 via-gray-900 to-black',
        !isCursorVisible && 'cursor-none'
      )}
      onMouseMove={handleGlobalMouseMove}
    >
      {/* --- 快捷键操作提示（低调显示） --- */}
      <Hint hint={volumeHint} className="bottom-8 right-8 px-4 py-2 text-sm">
        {(volume) => <>音量: {volume}%</>}
      </Hint>
      <Hint hint={seekHint} className="bottom-8 left-8 px-4 py-2 text-sm">
        {(text) => <>{text}</>}
      </Hint>
      <Hint hint={speedHint} className="bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 text-sm">
        {(text) => <>{text}</>}
      </Hint>

      {/* --- 主要内容 --- */}
      <main className="flex-1 flex flex-col items-center text-center pt-[30vh]">
        <div key={phaseKey} className="animate-fade-in">
          <h1
            className={clsx(
              'text-8xl font-bold mb-6',
              currentPhase.type === '学习'
                ? 'text-blue-100 drop-shadow-lg'
                : 'text-green-100 drop-shadow-lg'
            )}
          >
            {currentPhase.name}
          </h1>
          <p className="text-5xl font-light text-gray-300 mt-4 drop-shadow-md">
            {formatSecondsToClock(timeLeft)}
          </p>
        </div>
      </main>

      {/* --- 音频播放器 --- */}
      <audio ref={audioRef} src={audioDataUrl ?? undefined} loop hidden />

      {/* --- 独立的操作提示 --- */}
      <div
        className={clsx(
          'absolute bottom-8 left-0 right-0 z-20 text-center pointer-events-none',
          'transition-opacity duration-500',
          isControlsVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span className="bg-gray-900/80 px-3 py-1 rounded backdrop-blur-sm text-gray-400 text-xs">
          [空格] 播放/暂停 [←/→] 快进/退 [{modifierKeyDisplay}+←/→] 倍速 [↑/↓] 音量 [Esc] 退出
        </span>
      </div>

      {/* --- 底部进度条（极简设计） --- */}
      <footer
        className={clsx(
          'absolute bottom-0 left-0 right-0 z-10 cursor-pointer',
          'transition-opacity duration-300 hover:opacity-80',
          'opacity-10'
        )}
        onMouseMove={handleFooterMouseMove}
        onMouseLeave={() => setProgressHover(null)}
        onClick={handleProgressClick}
      >
        {/* 极简进度条 */}
        <div ref={progressBarRef} className="px-0">
          <Progress
            percent={audioProgress}
            showInfo={false}
            strokeColor="rgba(59, 130, 246, 0.6)"
            trailColor="rgba(255, 255, 255, 0.05)"
            strokeWidth={2}
            size="default"
          />
        </div>
      </footer>

      {/* 悬浮时才显示时间tooltip */}
      {progressHover && isControlsVisible && (
        <Tooltip
          title={progressHover.time}
          open={true}
          arrow={false}
          styles={{
            root: {
              position: 'fixed',
              left: progressHover.x + 15,
              top: progressHover.y - 40
            }
          }}
          getPopupContainer={() => fullscreenContainerRef.current!}
        ></Tooltip>
      )}
    </div>
  )
}

export const Route = createFileRoute('/focus')({
  component: Focus
})
