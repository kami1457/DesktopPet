/* ============================================
   可自定义桌宠 - 核心引擎（增强版）
   新增：粒子特效 / 好感度 / 物理抛投 / 番茄钟
         待办事项 / 随机语录 / 暗色模式 / 喂食
   ============================================ */

;(function () {
  'use strict'

  // ==========================================
  // 配置
  // ==========================================
  const DEFAULT_CONFIG = {
    size: 200,
    opacity: 100,
    speed: 100,
    mirror: false,
    follow: true,
    showStatus: true,
    physics: true,
    sleepDelay: 30,
    darkMode: false,
    posX: window.innerWidth - 240,
    posY: window.innerHeight - 240,
  }

  const SPRITE_SIZE = 256
  const STORAGE_KEY = 'desktop-pet-config'
  const IMAGES_KEY = 'desktop-pet-images'
  const AFFECTION_KEY = 'desktop-pet-affection'
  const TODO_KEY = 'desktop-pet-todos'

  // ==========================================
  // 随机语录库
  // ==========================================
  const QUOTES = [
    '今天也要元气满满哦！💪',
    '你笑起来真好看~',
    '累了就休息一下吧，我在这里陪你 ☕',
    '每一天都是新的开始~',
    '你是最棒的！不要忘记这一点 ⭐',
    '代码写不出来？试试休息五分钟~',
    '记得多喝水哦~ 💧',
    '今日事，今日毕！加油！',
    '生活就像一盒巧克力，你永远不知道下一颗是什么味道 🍫',
    '保持微笑，好运自然来~',
    '做你喜欢的事，喜欢你做的事 🌈',
    '不要忘记仰望星空 ✨',
    '适当摸鱼有益身心健康~ 🐟',
    '你已经很努力了，给自己一个奖励吧！',
    '世界那么大，先把手头的活干完吧 😄',
    '深呼吸...吸气...呼气... 放松一下~',
    '人生苦短，及时行乐 🎵',
    '你知道吗？猫咪一天要睡16个小时呢 😺',
    '站起来活动一下筋骨吧！🏃',
    '晚上早点睡，别熬夜啦~ 🌙',
  ]

  // ==========================================
  // 好感度等级定义
  // ==========================================
  const AFFECTION_LEVELS = [
    { level: 1, title: '陌生人', exp: 50, desc: '刚刚认识，多互动看看吧~' },
    { level: 2, title: '点头之交', exp: 120, desc: '开始熟悉起来了呢~' },
    { level: 3, title: '普通朋友', exp: 250, desc: '我们是朋友啦！' },
    { level: 4, title: '好朋友', exp: 500, desc: '你是我很重要的朋友！' },
    { level: 5, title: '挚友', exp: 1000, desc: '我最信任的人就是你！' },
    { level: 6, title: '知己', exp: 2000, desc: '有你在我身边真好~' },
    { level: 7, title: '灵魂伴侣', exp: 4000, desc: '我们心有灵犀！✨' },
    { level: 8, title: '永恒羁绊', exp: 8000, desc: '无论何时，我都在你身边 💕' },
    { level: 9, title: '传说之友', exp: 16000, desc: '你是传说级别的存在！🌟' },
    { level: 10, title: '♾ 不朽挚爱', exp: Infinity, desc: '超越时空的羁绊，永不分离 💖' },
  ]

  // ==========================================
  // 默认猫咪绘制器（灵动增强版）
  // ==========================================
  class DefaultCatRenderer {
    static draw(ctx, size, state) {
      const s = size / SPRITE_SIZE
      ctx.save()
      ctx.scale(s, s)

      const cx = 128
      const breathOffset = state.breathe * 3
      const tiltAngle = state.tilt * 0.05
      const swayX = (state.bodySwayX || 0) * 3
      const bobY = (state.headBobY || 0) * 4
      const jumpOffset = (state.jumpPhase || 0) * -45

      ctx.save()
      ctx.translate(cx + swayX, 140 + bobY + jumpOffset)
      ctx.rotate(tiltAngle)
      ctx.translate(-cx - swayX, -140 - bobY - jumpOffset)

      this.drawShadow(ctx, cx, jumpOffset)
      this.drawTail(ctx, cx, breathOffset, state)
      this.drawBody(ctx, cx, breathOffset, state)
      this.drawEars(ctx, cx, breathOffset, state)
      this.drawFace(ctx, cx, breathOffset, state)
      this.drawPaws(ctx, cx, breathOffset, state)

      ctx.restore()
      ctx.restore()
    }

    // ---- 地面阴影 ----
    static drawShadow(ctx, cx, jumpOffset) {
      const jF = Math.min(1, Math.abs(jumpOffset) / 45)
      const alpha = 0.07 * (1 - jF * 0.6)
      const sc = 1 + jF * 0.8
      ctx.save()
      ctx.fillStyle = `rgba(0,0,0,${alpha})`
      ctx.beginPath()
      ctx.ellipse(cx, 238, 55 / sc, 6 / sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // ---- 尾巴（情绪驱动速度/幅度） ----
    static drawTail(ctx, cx, breathOffset, state) {
      const pawY = 170 + breathOffset
      const tailSpeed = state.tailSpeed || 1
      const tailAmp = (state.tailAmplitude || 1) * 15
      const tailWag = Math.sin(Date.now() / 300 * tailSpeed + state.breathe) * tailAmp

      ctx.strokeStyle = '#e8e0d8'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx + 55, pawY + 10)
      ctx.quadraticCurveTo(cx + 88 + tailWag, pawY - 18, cx + 78 + tailWag * 1.5, pawY - 55)
      ctx.stroke()

      ctx.strokeStyle = '#f5f0eb'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(cx + 55, pawY + 10)
      ctx.quadraticCurveTo(cx + 88 + tailWag, pawY - 18, cx + 78 + tailWag * 1.5, pawY - 55)
      ctx.stroke()

      if (state.expression === 'happy') {
        ctx.strokeStyle = '#f0e8e0'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(cx + 78 + tailWag * 1.5, pawY - 58, 6, Math.PI * 0.5, Math.PI * 1.8)
        ctx.stroke()
      }
    }

    // ---- 身体（渐变 + 毛发纹理） ----
    static drawBody(ctx, cx, breathOffset, state) {
      const bodyY = 100 + breathOffset

      const bodyGrad = ctx.createRadialGradient(cx, bodyY + 55, 10, cx, bodyY + 60, 85)
      bodyGrad.addColorStop(0, '#faf5f0')
      bodyGrad.addColorStop(0.7, '#f5f0eb')
      bodyGrad.addColorStop(1, '#ede5dc')
      ctx.fillStyle = bodyGrad
      ctx.strokeStyle = '#d5ccc5'
      ctx.lineWidth = 1.8

      ctx.beginPath()
      ctx.ellipse(cx, bodyY + 60, 80, 70 - breathOffset * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const bellyGrad = ctx.createRadialGradient(cx, bodyY + 65, 5, cx, bodyY + 68, 50)
      bellyGrad.addColorStop(0, '#fffcfa')
      bellyGrad.addColorStop(1, 'rgba(250, 247, 244, 0.6)')
      ctx.fillStyle = bellyGrad
      ctx.beginPath()
      ctx.ellipse(cx, bodyY + 68, 50, 42, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(230, 220, 210, 0.25)'
      ctx.lineWidth = 1
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        const sx = cx + i * 12
        ctx.moveTo(sx, bodyY + 35)
        ctx.quadraticCurveTo(sx + i * 2, bodyY + 55 + Math.abs(i) * 3, sx + i * 3, bodyY + 80)
        ctx.stroke()
      }
    }

    // ---- 耳朵（独立旋转 + 情绪放平） ----
    static drawEars(ctx, cx, breathOffset, state) {
      const earY = 56 + breathOffset
      const twitchL = (state.earTwitchL || 0) * 0.06
      const twitchR = (state.earTwitchR || 0) * 0.06
      const flatten = (state.earFlatten || 0) * 0.35

      // 左耳
      ctx.save()
      const lPx = cx - 40, lPy = earY + 12
      ctx.translate(lPx, lPy)
      ctx.rotate(-flatten + twitchL)
      ctx.translate(-lPx, -lPy)

      ctx.fillStyle = '#f5f0eb'
      ctx.strokeStyle = '#d5ccc5'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(cx - 55, earY + 20)
      ctx.lineTo(cx - 70, earY - 28)
      ctx.lineTo(cx - 25, earY + 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      const earGradL = ctx.createLinearGradient(cx - 63, earY - 16, cx - 33, earY + 5)
      earGradL.addColorStop(0, '#ffb6c1')
      earGradL.addColorStop(1, '#ffc8d0')
      ctx.fillStyle = earGradL
      ctx.beginPath()
      ctx.moveTo(cx - 55, earY + 14)
      ctx.lineTo(cx - 63, earY - 16)
      ctx.lineTo(cx - 33, earY + 5)
      ctx.closePath()
      ctx.fill()

      ctx.restore()

      // 右耳
      ctx.save()
      const rPx = cx + 40, rPy = earY + 12
      ctx.translate(rPx, rPy)
      ctx.rotate(flatten + twitchR)
      ctx.translate(-rPx, -rPy)

      ctx.fillStyle = '#f5f0eb'
      ctx.strokeStyle = '#d5ccc5'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(cx + 55, earY + 20)
      ctx.lineTo(cx + 70, earY - 28)
      ctx.lineTo(cx + 25, earY + 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      const earGradR = ctx.createLinearGradient(cx + 63, earY - 16, cx + 33, earY + 5)
      earGradR.addColorStop(0, '#ffb6c1')
      earGradR.addColorStop(1, '#ffc8d0')
      ctx.fillStyle = earGradR
      ctx.beginPath()
      ctx.moveTo(cx + 55, earY + 14)
      ctx.lineTo(cx + 63, earY - 16)
      ctx.lineTo(cx + 33, earY + 5)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    // ---- 脸部（微表情系统） ----
    static drawFace(ctx, cx, breathOffset, state) {
      const faceY = 100 + breathOffset

      const headGrad = ctx.createRadialGradient(cx - 10, faceY - 10, 5, cx, faceY, 70)
      headGrad.addColorStop(0, '#faf7f4')
      headGrad.addColorStop(0.8, '#f5f0eb')
      headGrad.addColorStop(1, '#ede5dc')
      ctx.fillStyle = headGrad
      ctx.strokeStyle = '#d5ccc5'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.ellipse(cx, faceY, 68, 52, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // 额毛纹理
      ctx.strokeStyle = 'rgba(220, 210, 200, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - 8, faceY - 40)
      ctx.quadraticCurveTo(cx, faceY - 30, cx + 8, faceY - 40)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx - 15, faceY - 38)
      ctx.quadraticCurveTo(cx - 5, faceY - 28, cx + 5, faceY - 38)
      ctx.stroke()

      this.drawEyebrows(ctx, cx, faceY, state)
      this.drawEyes(ctx, cx, faceY, state)
      this.drawNose(ctx, cx, faceY, state)
      this.drawMouth(ctx, cx, faceY, state)
      this.drawBlush(ctx, cx, faceY, state)
      this.drawWhiskers(ctx, cx, faceY, state)

      if (state.expression === 'sleep') {
        this.drawSleepZzz(ctx, cx, faceY)
      }
    }

    // ---- 眉毛 ----
    static drawEyebrows(ctx, cx, faceY, state) {
      const eby = faceY - 5
      ctx.strokeStyle = 'rgba(180, 170, 160, 0.45)'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'

      let lA = 0, rA = 0, browY = -18
      if (state.expression === 'surprised') { browY = -23 }
      else if (state.expression === 'happy') { lA = 0.1; rA = -0.1; browY = -16 }
      else if (state.expression === 'sleep') { lA = 0.15; rA = -0.15; browY = -14 }

      ctx.save()
      ctx.translate(cx - 22, eby + browY); ctx.rotate(lA)
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -3, 8, 0); ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.translate(cx + 22, eby + browY); ctx.rotate(rA)
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -3, 10, 0); ctx.stroke()
      ctx.restore()
    }

    // ---- 眼睛（瞳孔扩缩 + 双高光 + 闪烁） ----
    static drawEyes(ctx, cx, faceY, state) {
      const eby = faceY - 5
      const px = state.lookX * 6, py = state.lookY * 4
      const dilation = state.pupilDilation || 1
      const sparkle = state.eyeSparkle || 0

      if (state.eyeOpen > 0.1) {
        const eo = state.eyeOpen
        // 左眼
        ctx.fillStyle = '#333'
        const lH = 12 * eo
        ctx.beginPath()
        ctx.ellipse(cx - 22 + px * 0.3, eby + py * 0.3, 10, lH, 0, 0, Math.PI * 2)
        ctx.fill()

        const pr = Math.min(5 * dilation, lH * 0.7)
        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.ellipse(cx - 22 + px, eby + py, pr, Math.min(pr * 1.2, lH * 0.6), 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.ellipse(cx - 19 + px * 0.7, eby - 3 + py * 0.5, 3.5, 3.5 * eo, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.beginPath()
        ctx.ellipse(cx - 25 + px * 0.5, eby + 3 + py * 0.3, 1.5, 1.5 * eo, 0, 0, Math.PI * 2)
        ctx.fill()

        // 右眼
        ctx.fillStyle = '#333'
        const rH = 12 * eo
        ctx.beginPath()
        ctx.ellipse(cx + 22 + px * 0.3, eby + py * 0.3, 10, rH, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.ellipse(cx + 22 + px, eby + py, pr, Math.min(pr * 1.2, rH * 0.6), 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.ellipse(cx + 25 + px * 0.7, eby - 3 + py * 0.5, 3.5, 3.5 * eo, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.beginPath()
        ctx.ellipse(cx + 19 + px * 0.5, eby + 3 + py * 0.3, 1.5, 1.5 * eo, 0, 0, Math.PI * 2)
        ctx.fill()

        // 眼睛闪烁
        if (sparkle > 0.1) {
          this.drawEyeSparkle(ctx, cx - 22 + px * 0.5, eby - 1, sparkle, eo)
          this.drawEyeSparkle(ctx, cx + 22 + px * 0.5, eby - 1, sparkle, eo)
        }
      } else {
        // 贝塞尔闭眼
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'

        ctx.beginPath()
        ctx.moveTo(cx - 32, eby)
        ctx.bezierCurveTo(cx - 28, eby + 6, cx - 16, eby + 6, cx - 12, eby)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx + 12, eby)
        ctx.bezierCurveTo(cx + 16, eby + 6, cx + 28, eby + 6, cx + 32, eby)
        ctx.stroke()

        // 睫毛
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(cx - 14, eby + 1); ctx.lineTo(cx - 12, eby + 4); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + 14, eby + 1); ctx.lineTo(cx + 12, eby + 4); ctx.stroke()
      }
    }

    // ---- 眼睛十字闪烁 ----
    static drawEyeSparkle(ctx, x, y, intensity, eyeOpen) {
      if (eyeOpen < 0.5) return
      ctx.save()
      ctx.globalAlpha = intensity * eyeOpen
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.2
      const t = Date.now() / 800
      const s = 3 + Math.sin(t) * 1.2

      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke()

      const s2 = s * 0.55
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x - s2, y - s2); ctx.lineTo(x, y - s2 * 1.4); ctx.lineTo(x + s2, y - s2)
      ctx.stroke()

      ctx.restore()
    }

    // ---- 鼻子（微动 + 高光） ----
    static drawNose(ctx, cx, faceY, state) {
      const nw = (state.noseWiggle || 0) * 0.5
      ctx.fillStyle = '#ffb0bc'
      ctx.beginPath()
      ctx.ellipse(cx + nw, faceY + 8, 4.5, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 220, 230, 0.6)'
      ctx.beginPath()
      ctx.ellipse(cx - 1.5 + nw, faceY + 7, 1.8, 1.2, -0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    // ---- 嘴巴（多形态） ----
    static drawMouth(ctx, cx, faceY, state) {
      const mouthOpen = state.mouthOpen || 0
      const mouthShape = state.mouthShape || 'auto'
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'

      const shape = mouthShape !== 'auto' ? mouthShape : (
        state.expression === 'happy' ? 'smile' :
        state.expression === 'surprised' ? 'o' : 'w'
      )

      switch (shape) {
        case 'smile':
          ctx.beginPath()
          ctx.moveTo(cx - 12, faceY + 13)
          ctx.bezierCurveTo(cx - 6, faceY + 22, cx + 6, faceY + 22, cx + 12, faceY + 13)
          ctx.stroke()
          break
        case 'o':
          ctx.fillStyle = '#ff9999'
          ctx.beginPath()
          ctx.ellipse(cx, faceY + 16, 6, 8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#e08888'
          ctx.stroke()
          ctx.fillStyle = '#ff8888'
          ctx.beginPath()
          ctx.ellipse(cx, faceY + 20, 3, 2.5, 0, 0, Math.PI)
          ctx.fill()
          break
        case 'yawn': {
          const ys = Math.max(0.1, mouthOpen)
          ctx.fillStyle = '#ff8888'
          ctx.beginPath()
          ctx.ellipse(cx, faceY + 15, 10 * ys, 14 * ys, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#d07070'
          ctx.lineWidth = 1.2
          ctx.stroke()
          ctx.fillStyle = '#ff7070'
          ctx.beginPath()
          ctx.ellipse(cx, faceY + 18 + 4 * ys, 6 * ys, 5 * ys, 0, 0, Math.PI)
          ctx.fill()
          if (ys > 0.4) {
            ctx.fillStyle = '#fff'
            ctx.beginPath()
            ctx.moveTo(cx - 5, faceY + 10); ctx.lineTo(cx - 3, faceY + 8 + 14 * ys); ctx.lineTo(cx - 7, faceY + 10)
            ctx.fill()
            ctx.beginPath()
            ctx.moveTo(cx + 5, faceY + 10); ctx.lineTo(cx + 3, faceY + 8 + 14 * ys); ctx.lineTo(cx + 7, faceY + 10)
            ctx.fill()
          }
          break
        }
        case 'meow': {
          const ms = Math.max(0.2, mouthOpen)
          ctx.fillStyle = '#ff9999'
          ctx.beginPath()
          ctx.ellipse(cx, faceY + 15, 4 * ms, 5 * ms, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#d08080'
          ctx.stroke()
          break
        }
        default: // 'w'
          ctx.beginPath()
          ctx.moveTo(cx - 8, faceY + 14)
          ctx.quadraticCurveTo(cx - 4, faceY + 18, cx, faceY + 14)
          ctx.quadraticCurveTo(cx + 4, faceY + 18, cx + 8, faceY + 14)
          ctx.stroke()
      }
    }

    // ---- 腮红（动态强度） ----
    static drawBlush(ctx, cx, faceY, state) {
      const intensity = state.blushIntensity || 0.25
      const alpha = intensity * 0.4

      ctx.fillStyle = `rgba(255, 182, 193, ${alpha})`
      ctx.beginPath()
      ctx.ellipse(cx - 38, faceY + 8, 12 + intensity * 3, 7 + intensity * 2, -0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx + 38, faceY + 8, 12 + intensity * 3, 7 + intensity * 2, 0.1, 0, Math.PI * 2)
      ctx.fill()

      if (intensity > 0.4) {
        ctx.strokeStyle = `rgba(255, 160, 180, ${(intensity - 0.4) * 0.5})`
        ctx.lineWidth = 0.8
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(cx - 46, faceY + 6 + i * 3); ctx.lineTo(cx - 30, faceY + 6 + i * 3); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(cx + 30, faceY + 6 + i * 3); ctx.lineTo(cx + 46, faceY + 6 + i * 3); ctx.stroke()
        }
      }
    }

    // ---- 胡须（三根×两侧，带微动） ----
    static drawWhiskers(ctx, cx, faceY, state) {
      const tw = state.whiskerTwitch || 0
      ctx.strokeStyle = '#d0c8c0'
      ctx.lineWidth = 1

      ctx.beginPath(); ctx.moveTo(cx - 40, faceY + 5); ctx.lineTo(cx - 70, faceY - 3 + Math.sin(tw * 40) * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - 40, faceY + 10); ctx.lineTo(cx - 70, faceY + 9 + Math.sin(tw * 40 + 1) * 1.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - 38, faceY + 15); ctx.lineTo(cx - 65, faceY + 18 + Math.sin(tw * 40 + 2) * 1.5); ctx.stroke()

      ctx.beginPath(); ctx.moveTo(cx + 40, faceY + 5); ctx.lineTo(cx + 70, faceY - 3 + Math.sin(tw * 40 + 3) * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + 40, faceY + 10); ctx.lineTo(cx + 70, faceY + 9 + Math.sin(tw * 40 + 4) * 1.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + 38, faceY + 15); ctx.lineTo(cx + 65, faceY + 18 + Math.sin(tw * 40 + 5) * 1.5); ctx.stroke()
    }

    // ---- 睡觉 zzZ ----
    static drawSleepZzz(ctx, cx, faceY) {
      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = 'rgba(100, 100, 200, 0.6)'
      const zp = (Date.now() / 1000) % 3
      ctx.save()
      ctx.translate(cx + 50, faceY - 30 - zp * 8)
      ctx.globalAlpha = 1 - zp / 3
      ctx.fillText('z', 0, 0)
      ctx.fillText('z', 12, -12)
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText('Z', 24, -28)
      ctx.restore()
    }

    // ---- 前爪（渐变肉垫 + 三趾） ----
    static drawPaws(ctx, cx, breathOffset, state) {
      const pawY = 170 + breathOffset

      const leftPawX = cx - 45 + (state.pawLeftX || 0) * 10
      const leftPawY = pawY + (state.pawLeftY || 0) * 5

      ctx.fillStyle = '#f5f0eb'
      ctx.strokeStyle = '#d5ccc5'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.ellipse(leftPawX, leftPawY, 22, 14, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const pg1 = ctx.createRadialGradient(leftPawX, leftPawY + 2, 1, leftPawX, leftPawY + 2, 10)
      pg1.addColorStop(0, '#ffc0cb')
      pg1.addColorStop(1, '#ffccd5')
      ctx.fillStyle = pg1
      ctx.beginPath()
      ctx.ellipse(leftPawX, leftPawY + 2, 10, 7, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffb8c8'
      ctx.beginPath(); ctx.ellipse(leftPawX - 7, leftPawY - 4, 4, 3, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(leftPawX + 7, leftPawY - 4, 4, 3, 0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(leftPawX, leftPawY - 6, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill()

      // 右爪
      const rightPawX = cx + 45 + (state.pawRightX || 0) * 10
      const rightPawY = pawY + (state.pawRightY || 0) * 5

      ctx.fillStyle = '#f5f0eb'
      ctx.strokeStyle = '#d5ccc5'
      ctx.beginPath()
      ctx.ellipse(rightPawX, rightPawY, 22, 14, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const pg2 = ctx.createRadialGradient(rightPawX, rightPawY + 2, 1, rightPawX, rightPawY + 2, 10)
      pg2.addColorStop(0, '#ffc0cb')
      pg2.addColorStop(1, '#ffccd5')
      ctx.fillStyle = pg2
      ctx.beginPath()
      ctx.ellipse(rightPawX, rightPawY + 2, 10, 7, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffb8c8'
      ctx.beginPath(); ctx.ellipse(rightPawX - 7, rightPawY - 4, 4, 3, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(rightPawX + 7, rightPawY - 4, 4, 3, 0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(rightPawX, rightPawY - 6, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill()
    }
  }

  // ==========================================
  // 图片管理器
  // ==========================================
  class ImageManager {
    constructor() {
      this.images = {}
      this.imageData = {}
      this.loadFromStorage()
    }

    loadFromStorage() {
      try {
        const saved = localStorage.getItem(IMAGES_KEY)
        if (saved) {
          this.imageData = JSON.parse(saved)
          for (const [state, data] of Object.entries(this.imageData)) {
            const img = new Image()
            img.src = data
            this.images[state] = img
          }
        }
      } catch { /* ignore */ }
    }

    saveToStorage() {
      try {
        localStorage.setItem(IMAGES_KEY, JSON.stringify(this.imageData))
      } catch { /* ignore */ }
    }

    loadImage(file, stateName) {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
          resolve({ success: false, message: '请上传图片文件' })
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            if (img.width !== SPRITE_SIZE || img.height !== SPRITE_SIZE) {
              console.warn(`图片尺寸为 ${img.width}×${img.height}，建议使用 ${SPRITE_SIZE}×${SPRITE_SIZE}`)
            }
            this.images[stateName] = img
            this.imageData[stateName] = e.target.result
            this.saveToStorage()
            resolve({ success: true, message: '替换成功！' })
          }
          img.onerror = () => {
            resolve({ success: false, message: '图片加载失败' })
          }
          img.src = e.target.result
        }
        reader.readAsDataURL(file)
      })
    }

    hasCustomImage(stateName) { return !!this.images[stateName] }
    getImage(stateName) { return this.images[stateName] || null }

    removeImage(stateName) {
      delete this.images[stateName]
      delete this.imageData[stateName]
      this.saveToStorage()
    }

    removeAll() {
      this.images = {}
      this.imageData = {}
      this.saveToStorage()
    }

    exportConfig() {
      return JSON.stringify(this.imageData, null, 2)
    }

    importConfig(jsonStr) {
      try {
        const data = JSON.parse(jsonStr)
        this.imageData = data
        this.images = {}
        for (const [state, dataUrl] of Object.entries(data)) {
          const img = new Image()
          img.src = dataUrl
          this.images[state] = img
        }
        this.saveToStorage()
        return { success: true, message: '导入成功！' }
      } catch {
        return { success: false, message: '配置文件格式错误' }
      }
    }
  }

  // ==========================================
  // 粒子系统
  // ==========================================
  class ParticleSystem {
    constructor() {
      this.canvas = document.getElementById('particle-canvas')
      this.ctx = this.canvas.getContext('2d')
      this.particles = []
      this.resize()
      window.addEventListener('resize', () => this.resize())
    }

    resize() {
      const dpr = window.devicePixelRatio || 1
      this.canvas.width = window.innerWidth * dpr
      this.canvas.height = window.innerHeight * dpr
      this.canvas.style.width = window.innerWidth + 'px'
      this.canvas.style.height = window.innerHeight + 'px'
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    emit(x, y, type, count) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          decay: 0.008 + Math.random() * 0.012,
          size: 8 + Math.random() * 10,
          type,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.15,
        })
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.03 // 微重力
        p.vx *= 0.99
        p.life -= p.decay
        p.rotation += p.rotSpeed
        if (p.life <= 0) {
          this.particles.splice(i, 1)
        }
      }
    }

    render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      for (const p of this.particles) {
        this.ctx.save()
        this.ctx.translate(p.x, p.y)
        this.ctx.rotate(p.rotation)
        this.ctx.globalAlpha = Math.max(0, p.life)
        const s = p.size * (0.5 + p.life * 0.5)

        if (p.type === 'heart') {
          this.drawHeart(this.ctx, 0, 0, s)
        } else if (p.type === 'star') {
          this.drawStar(this.ctx, 0, 0, s)
        } else if (p.type === 'food') {
          this.ctx.font = s + 'px sans-serif'
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillText('🍖', 0, 0)
        } else if (p.type === 'sparkle') {
          this.drawSparkle(this.ctx, 0, 0, s)
        } else if (p.type === 'note') {
          this.ctx.font = s + 'px sans-serif'
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillText(['♪', '♫', '♬', '🎵'][Math.floor(p.rotation * 2) % 4], 0, 0)
        }

        this.ctx.restore()
      }
    }

    drawHeart(ctx, x, y, size) {
      const s = size / 16
      ctx.fillStyle = '#ff6b81'
      ctx.beginPath()
      ctx.moveTo(x, y + 4 * s)
      ctx.bezierCurveTo(x, y - 2 * s, x - 8 * s, y - 2 * s, x - 8 * s, y + 2 * s)
      ctx.bezierCurveTo(x - 8 * s, y + 6 * s, x, y + 10 * s, x, y + 12 * s)
      ctx.bezierCurveTo(x, y + 10 * s, x + 8 * s, y + 6 * s, x + 8 * s, y + 2 * s)
      ctx.bezierCurveTo(x + 8 * s, y - 2 * s, x, y - 2 * s, x, y + 4 * s)
      ctx.fill()
    }

    drawStar(ctx, x, y, size) {
      const s = size / 2
      ctx.fillStyle = '#feca57'
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const r = i === 0 ? s : s
        const method = i === 0 ? 'moveTo' : 'lineTo'
        ctx[method](x + Math.cos(angle) * s, y + Math.sin(angle) * s)
        const innerAngle = angle + (2 * Math.PI) / 10
        ctx.lineTo(x + Math.cos(innerAngle) * s * 0.4, y + Math.sin(innerAngle) * s * 0.4)
      }
      ctx.closePath()
      ctx.fill()
    }

    drawSparkle(ctx, x, y, size) {
      ctx.fillStyle = '#ffeaa7'
      const s = size / 2
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(angle - 0.2) * s * 0.3, y + Math.sin(angle - 0.2) * s * 0.3)
        ctx.lineTo(x + Math.cos(angle) * s, y + Math.sin(angle) * s)
        ctx.lineTo(x + Math.cos(angle + 0.2) * s * 0.3, y + Math.sin(angle + 0.2) * s * 0.3)
      }
      ctx.closePath()
      ctx.fill()
    }
  }

  // ==========================================
  // 桌宠核心类
  // ==========================================
  class DesktopPet {
    constructor() {
      // DOM
      this.container = document.getElementById('pet-container')
      this.canvas = document.getElementById('pet-canvas')
      this.ctx = this.canvas.getContext('2d')
      this.speechBubble = document.getElementById('pet-speech')
      this.settingsPanel = document.getElementById('settings-panel')
      this.contextMenu = document.getElementById('context-menu')
      this.showPetBtn = document.getElementById('show-pet')
      this.statusBar = document.getElementById('pet-status-bar')
      this.statusHideTimer = null
      this.scheduleStatusBarHide = null

      // 管理器
      this.imageManager = new ImageManager()
      this.particles = new ParticleSystem()

      // 配置
      this.config = { ...DEFAULT_CONFIG }
      this.loadConfig()

      // 动画状态（灵动增强）
      this.animState = {
        breathe: 0,
        eyeOpen: 1,
        lookX: 0,
        lookY: 0,
        tilt: 0,
        expression: 'idle',
        pawLeftX: 0,
        pawLeftY: 0,
        pawRightX: 0,
        pawRightY: 0,
        squish: 0,
        rotation: 0,
        customAnimPhase: 0,
        // ★ 耳朵独立微动
        earTwitchL: 0,
        earTwitchR: 0,
        earFlatten: 0,
        // ★ 眼部增强
        pupilDilation: 1,
        eyeSparkle: 0,
        // ★ 微表情
        blushIntensity: 0.25,
        whiskerTwitch: 0,
        mouthOpen: 0,
        mouthShape: 'auto',
        noseWiggle: 0,
        // ★ 身体灵动
        bodySwayX: 0,
        bodySwayY: 0,
        headBobY: 0,
        tailSpeed: 1,
        tailAmplitude: 1,
        jumpPhase: 0,
      }

      // 状态
      this.currentState = 'idle'
      this.isDragging = false
      this.dragOffset = { x: 0, y: 0 }
      this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      this.lastInteraction = Date.now()
      this.blinkTimer = 0
      this.blinkInterval = this.randomBlinkInterval()
      this.speechTimeout = null
      this.spinAngle = 0
      this.wavePhase = 0
      this.frameCount = 0

      // 目标追踪值（平滑过渡）
      this.targetLookX = 0
      this.targetLookY = 0
      this.targetTilt = 0

      // ★ 空闲行为系统
      this.idleBehavior = 'none'
      this.idleBehaviorTimer = 0
      this.idleBehaviorDuration = 0
      this.idleBehaviorPhase = 0
      this.nextIdleBehaviorTime = 5000 + Math.random() * 10000

      // ★ 物理抛投
      this.velocity = { x: 0, y: 0 }
      this.lastDragPos = { x: 0, y: 0 }
      this.lastDragTime = 0
      this.isPhysicsActive = false
      this.gravity = 0.42
      this.bounceDamping = 0.5
      this.friction = 0.95
      this.throwVelocityScale = 10
      this.maxThrowSpeedX = 18
      this.maxThrowSpeedY = 14
      this.minThrowSpeed = 2.6

      // ★ 好感度系统
      this.affection = {
        level: 1,
        exp: 0,
        hunger: 100,
        totalInteractions: 0,
        totalFeeds: 0,
        firstMeet: Date.now(),
        lastHungerDecay: Date.now(),
      }
      this.loadAffection()

      // ★ 番茄钟
      this.pomodoro = {
        isRunning: false,
        isPaused: false,
        isBreak: false,
        remaining: 25 * 60,
        workDuration: 25 * 60,
        breakDuration: 5 * 60,
        completed: 0,
        interval: null,
      }

      // ★ 待办事项
      this.todos = []
      this.loadTodos()

      // ★ 语录定时
      this.quoteTimer = 0
      this.quoteInterval = 120000 + Math.random() * 180000 // 2~5 分钟随机语录

      this.init()
    }

    // ========================================
    // 初始化
    // ========================================
    init() {
      this.applyConfig()
      this.applyDarkMode()
      this.bindEvents()
      this.updatePreviews()
      this.updateStatusBar()
      this.updateAffectionUI()
      this.renderTodos()
      this.requestFrame()

      // 按时间段打招呼
      setTimeout(() => {
        const greeting = this.getTimeGreeting()
        const holiday = this.checkHoliday()
        this.say(holiday || greeting)
      }, 500)

      // 饥饿衰减定时器
      this.hungerInterval = setInterval(() => this.decayHunger(), 60000)
    }

    // ========================================
    // 时间问候 & 节日检测
    // ========================================
    getTimeGreeting() {
      const h = new Date().getHours()
      if (h >= 5 && h < 8) return '早上好~ ☀️ 新的一天开始啦！'
      if (h >= 8 && h < 12) return '上午好~ 今天也请多多关照！😊'
      if (h >= 12 && h < 14) return '中午好~ 记得吃午饭哦！🍱'
      if (h >= 14 && h < 18) return '下午好~ 下午茶时间？☕'
      if (h >= 18 && h < 20) return '傍晚好~ 辛苦了一天！🌇'
      if (h >= 20 && h < 23) return '晚上好~ 放松一下吧~🌙'
      return '夜深了~ 该睡觉了哦！😴💫'
    }

    checkHoliday() {
      const now = new Date()
      const m = now.getMonth() + 1
      const d = now.getDate()
      if (m === 1 && d === 1) return '🎉 新年快乐！新的一年万事如意！'
      if (m === 2 && d === 14) return '💕 情人节快乐！有人送你巧克力了吗？'
      if (m === 3 && d === 8) return '🌸 女神节快乐！今天是你的节日！'
      if (m === 5 && d === 1) return '🎊 劳动节快乐！辛苦了！'
      if (m === 6 && d === 1) return '🎈 儿童节快乐！保持一颗童心~'
      if (m === 10 && d === 1) return '🇨🇳 国庆节快乐！祖国生日快乐！'
      if (m === 12 && d === 25) return '🎄 圣诞快乐！Merry Christmas!'
      if (m === 12 && d === 31) return '🎆 倒计时！明天就是新年啦！'
      return null
    }

    // ========================================
    // 配置管理
    // ========================================
    loadConfig() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) Object.assign(this.config, JSON.parse(saved))
      } catch { /* ignore */ }
    }

    saveConfig() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
      } catch { /* ignore */ }
    }

    applyConfig() {
      const { size, opacity, posX, posY, mirror, showStatus } = this.config
      const dpr = window.devicePixelRatio || 1

      this.canvas.width = size * dpr
      this.canvas.height = size * dpr
      this.canvas.style.width = size + 'px'
      this.canvas.style.height = size + 'px'

      this.container.style.left = Math.min(posX, window.innerWidth - size) + 'px'
      this.container.style.top = Math.min(posY, window.innerHeight - size) + 'px'
      this.container.style.opacity = opacity / 100
      this.container.style.transform = mirror ? 'scaleX(-1)' : ''

      if (this.statusBar) {
        this.statusBar.classList.toggle('hidden', !showStatus)
        if (showStatus && typeof this.scheduleStatusBarHide === 'function') this.scheduleStatusBarHide()
      }

      this.syncSettingsUI()
    }

    applyDarkMode() {
      document.documentElement.setAttribute('data-theme', this.config.darkMode ? 'dark' : 'light')
      const label = document.getElementById('dark-mode-label')
      if (label) label.textContent = this.config.darkMode ? '☀️ 亮色模式' : '🌙 暗色模式'
    }

    syncSettingsUI() {
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val }
      const setDisplay = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text }
      const setCheck = (id, checked) => { const el = document.getElementById(id); if (el) el.checked = checked }

      setVal('pet-size', this.config.size)
      setDisplay('pet-size-value', this.config.size + 'px')
      setVal('pet-opacity', this.config.opacity)
      setDisplay('pet-opacity-value', this.config.opacity + '%')
      setVal('pet-speed', this.config.speed)
      setDisplay('pet-speed-value', this.config.speed + '%')
      setVal('pet-sleep-delay', this.config.sleepDelay)
      setDisplay('pet-sleep-delay-value', this.config.sleepDelay + 's')
      setCheck('pet-mirror', this.config.mirror)
      setCheck('pet-follow', this.config.follow)
      setCheck('pet-show-status', this.config.showStatus)
      setCheck('pet-physics', this.config.physics)
    }

    // ========================================
    // 好感度系统
    // ========================================
    loadAffection() {
      try {
        const saved = localStorage.getItem(AFFECTION_KEY)
        if (saved) Object.assign(this.affection, JSON.parse(saved))
      } catch { /* ignore */ }
    }

    saveAffection() {
      try {
        localStorage.setItem(AFFECTION_KEY, JSON.stringify(this.affection))
      } catch { /* ignore */ }
    }

    addAffection(amount) {
      this.affection.exp += amount
      this.affection.totalInteractions++
      this.checkLevelUp()
      this.saveAffection()
      this.updateStatusBar()
      this.updateAffectionUI()
    }

    checkLevelUp() {
      const currentLevelData = AFFECTION_LEVELS[this.affection.level - 1]
      if (!currentLevelData) return
      while (this.affection.exp >= currentLevelData.exp && this.affection.level < AFFECTION_LEVELS.length) {
        this.affection.exp -= currentLevelData.exp
        this.affection.level++
        const newLevel = AFFECTION_LEVELS[this.affection.level - 1]
        this.say(`🎉 好感度升级！Lv.${this.affection.level} - ${newLevel.title}`)
        this.particles.emit(
          this.container.getBoundingClientRect().left + this.config.size / 2,
          this.container.getBoundingClientRect().top,
          'sparkle', 15
        )
        break // 一次只升一级
      }
    }

    decayHunger() {
      if (this.affection.hunger > 0) {
        this.affection.hunger = Math.max(0, this.affection.hunger - 2)
        this.saveAffection()
        this.updateStatusBar()
      }
      // 饿了会说话
      if (this.affection.hunger <= 20 && this.affection.hunger > 0) {
        this.say('好饿呀... 能给我点吃的吗？🥺')
      } else if (this.affection.hunger === 0) {
        this.animState.expression = 'idle'
      }
    }

    getMoodIcon() {
      if (this.affection.hunger <= 10) return '😢'
      if (this.affection.hunger <= 30) return '😕'
      if (this.affection.level >= 7) return '🥰'
      if (this.affection.level >= 4) return '😄'
      return '😊'
    }

    updateStatusBar() {
      const levelData = AFFECTION_LEVELS[this.affection.level - 1]
      const expPercent = levelData.exp === Infinity ? 100 : (this.affection.exp / levelData.exp) * 100

      const affBar = document.getElementById('affection-bar')
      const affLevel = document.getElementById('affection-level')
      const hungerBar = document.getElementById('hunger-bar')
      const moodIcon = document.getElementById('mood-icon')

      if (affBar) affBar.style.width = Math.min(100, expPercent) + '%'
      if (affLevel) affLevel.textContent = 'Lv.' + this.affection.level
      if (hungerBar) hungerBar.style.width = this.affection.hunger + '%'
      if (moodIcon) moodIcon.textContent = this.getMoodIcon()
    }

    updateAffectionUI() {
      const levelData = AFFECTION_LEVELS[this.affection.level - 1]
      const expPercent = levelData.exp === Infinity ? 100 : (this.affection.exp / levelData.exp) * 100

      const titleEl = document.getElementById('affection-title')
      const lvEl = document.getElementById('affection-lv-display')
      const expBar = document.getElementById('affection-exp-bar')
      const descEl = document.getElementById('affection-desc')
      const interEl = document.getElementById('stat-interactions')
      const feedEl = document.getElementById('stat-feeds')
      const dayEl = document.getElementById('stat-days')

      if (titleEl) titleEl.textContent = levelData.title
      if (lvEl) lvEl.textContent = 'Lv.' + this.affection.level
      if (expBar) expBar.style.width = Math.min(100, expPercent) + '%'
      if (descEl) descEl.textContent = levelData.desc
      if (interEl) interEl.textContent = this.affection.totalInteractions
      if (feedEl) feedEl.textContent = this.affection.totalFeeds

      const days = Math.max(1, Math.floor((Date.now() - this.affection.firstMeet) / 86400000) + 1)
      if (dayEl) dayEl.textContent = days
    }

    // ========================================
    // 喂食
    // ========================================
    doFeed() {
      if (this.affection.hunger >= 100) {
        this.say('吃不下了~ 我已经很饱啦！🤭')
        return
      }
      this.affection.hunger = Math.min(100, this.affection.hunger + 25)
      this.affection.totalFeeds++
      this.addAffection(5)

      this.animState.expression = 'happy'
      this.animState.mouthShape = 'meow'
      this.animState.mouthOpen = 0.7
      this.say('好吃！谢谢你~ 🍖✨')

      const rect = this.container.getBoundingClientRect()
      this.particles.emit(rect.left + this.config.size / 2, rect.top + this.config.size / 2, 'food', 6)

      setTimeout(() => {
        if (this.currentState !== 'sleeping') {
          this.animState.expression = 'idle'
          this.animState.mouthShape = 'auto'
          this.animState.mouthOpen = 0
        }
      }, 2000)
    }

    // ========================================
    // 事件绑定
    // ========================================
    bindEvents() {
      const showStatusBar = () => {
        if (!this.statusBar || !this.config.showStatus) return
        if (this.statusHideTimer) {
          clearTimeout(this.statusHideTimer)
          this.statusHideTimer = null
        }
        this.statusBar.classList.add('status-visible')
      }

      const hideStatusBarLater = () => {
        if (!this.statusBar) return
        if (this.statusHideTimer) clearTimeout(this.statusHideTimer)
        if (!this.config.showStatus) {
          this.statusBar.classList.remove('status-visible')
          return
        }
        this.statusHideTimer = setTimeout(() => {
          this.statusBar.classList.remove('status-visible')
        }, 2200)
      }

      this.scheduleStatusBarHide = hideStatusBarLater

      // 鼠标移动追踪
      document.addEventListener('mousemove', (e) => {
        this.mousePos = { x: e.clientX, y: e.clientY }
        this.lastInteraction = Date.now()

        if (this.currentState === 'sleeping') {
          this.currentState = 'idle'
          this.animState.expression = 'idle'
          this.say('嗯..? 我醒啦！')
        }
      })

      // 拖拽（含物理速度追踪）
      this.container.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isDragging = true
          this.currentState = 'dragging'
          this.isPhysicsActive = false
          this.velocity = { x: 0, y: 0 }
          this.container.classList.add('dragging')
          const rect = this.container.getBoundingClientRect()
          this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          }
          this.lastDragPos = { x: e.clientX, y: e.clientY }
          this.lastDragTime = Date.now()
          this.animState.expression = 'surprised'
          this.endIdleBehavior()
          e.preventDefault()
        }
      })

      document.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
          const x = e.clientX - this.dragOffset.x
          const y = e.clientY - this.dragOffset.y
          this.container.style.left = x + 'px'
          this.container.style.top = y + 'px'
          this.config.posX = x
          this.config.posY = y

          // 计算速度
          const now = Date.now()
          const dt = Math.max(1, now - this.lastDragTime)
          const rawVx = (e.clientX - this.lastDragPos.x) / dt * this.throwVelocityScale
          const rawVy = (e.clientY - this.lastDragPos.y) / dt * this.throwVelocityScale
          this.velocity.x = Math.max(-this.maxThrowSpeedX, Math.min(this.maxThrowSpeedX, rawVx))
          this.velocity.y = Math.max(-this.maxThrowSpeedY, Math.min(this.maxThrowSpeedY, rawVy))
          this.lastDragPos = { x: e.clientX, y: e.clientY }
          this.lastDragTime = now
        }
      })

      document.addEventListener('mouseup', () => {
        if (this.isDragging) {
          this.isDragging = false
          this.container.classList.remove('dragging')

          // 物理抛投判定
          const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2)
          if (this.config.physics && speed > this.minThrowSpeed) {
            this.isPhysicsActive = true
            this.currentState = 'flying'
            this.animState.expression = 'surprised'
            this.say('哇啊啊啊~ 😵‍💫')
          } else {
            this.currentState = 'idle'
            this.animState.expression = 'idle'
            this.saveConfig()
          }
        }
      })

      // 点击互动
      this.container.addEventListener('click', (e) => {
        if (e.detail === 1) this.onPetClick()
      })

      this.container.addEventListener('dblclick', () => {
        this.onPetDoubleClick()
      })

      this.container.addEventListener('mouseenter', () => {
        showStatusBar()
      })
      this.container.addEventListener('mouseleave', () => {
        hideStatusBarLater()
      })

      // 右键菜单
      this.container.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.showContextMenu(e.clientX, e.clientY)
      })

      document.addEventListener('click', (e) => {
        if (!this.contextMenu.contains(e.target)) this.hideContextMenu()
      })

      document.addEventListener('contextmenu', (e) => {
        if (!this.container.contains(e.target)) this.hideContextMenu()
      })

      // 右键菜单项
      document.getElementById('menu-settings').addEventListener('click', () => { this.hideContextMenu(); this.openSettings() })
      document.getElementById('menu-reset-pos').addEventListener('click', () => { this.hideContextMenu(); this.resetPosition() })
      document.getElementById('menu-wave').addEventListener('click', () => { this.hideContextMenu(); this.doWave() })
      document.getElementById('menu-spin').addEventListener('click', () => { this.hideContextMenu(); this.doSpin() })
      document.getElementById('menu-stretch').addEventListener('click', () => { this.hideContextMenu(); this.doStretch() })
      document.getElementById('menu-dance').addEventListener('click', () => { this.hideContextMenu(); this.doDance() })
      document.getElementById('menu-jump').addEventListener('click', () => { this.hideContextMenu(); this.doJump() })
      document.getElementById('menu-sleep').addEventListener('click', () => { this.hideContextMenu(); this.doSleep() })
      document.getElementById('menu-feed').addEventListener('click', () => { this.hideContextMenu(); this.doFeed() })
      document.getElementById('menu-hide').addEventListener('click', () => { this.hideContextMenu(); this.hidePet() })
      document.getElementById('menu-quote').addEventListener('click', () => { this.hideContextMenu(); this.showRandomQuote() })

      document.getElementById('menu-dark-mode').addEventListener('click', () => {
        this.hideContextMenu()
        this.config.darkMode = !this.config.darkMode
        this.applyDarkMode()
        this.saveConfig()
        this.say(this.config.darkMode ? '已切换暗色模式 🌙' : '已切换亮色模式 ☀️')
      })

      // 番茄钟菜单
      document.getElementById('menu-pomodoro').addEventListener('click', () => {
        this.hideContextMenu()
        this.toggleMiniPanel('pomodoro-panel')
      })

      // 待办菜单
      document.getElementById('menu-todo').addEventListener('click', () => {
        this.hideContextMenu()
        this.toggleMiniPanel('todo-panel')
      })

      // 显示桌宠按钮
      this.showPetBtn.addEventListener('click', () => this.showPet())

      // 设置面板
      document.getElementById('close-settings').addEventListener('click', () => this.closeSettings())

      // 设置滑块
      this.bindSlider('pet-size', 'pet-size-value', 'px', (v) => { this.config.size = v; this.applyConfig(); this.saveConfig() })
      this.bindSlider('pet-opacity', 'pet-opacity-value', '%', (v) => { this.config.opacity = v; this.container.style.opacity = v / 100; this.saveConfig() })
      this.bindSlider('pet-speed', 'pet-speed-value', '%', (v) => { this.config.speed = v; this.saveConfig() })
      this.bindSlider('pet-sleep-delay', 'pet-sleep-delay-value', 's', (v) => { this.config.sleepDelay = v; this.saveConfig() })

      // 开关
      document.getElementById('pet-mirror').addEventListener('change', (e) => {
        this.config.mirror = e.target.checked
        this.container.style.transform = e.target.checked ? 'scaleX(-1)' : ''
        this.saveConfig()
      })

      document.getElementById('pet-follow').addEventListener('change', (e) => {
        this.config.follow = e.target.checked; this.saveConfig()
      })

      document.getElementById('pet-show-status').addEventListener('change', (e) => {
        this.config.showStatus = e.target.checked
        this.statusBar.classList.toggle('hidden', !e.target.checked)
        if (e.target.checked) {
          showStatusBar()
          hideStatusBarLater()
        } else {
          if (this.statusHideTimer) {
            clearTimeout(this.statusHideTimer)
            this.statusHideTimer = null
          }
          this.statusBar.classList.remove('status-visible')
        }
        this.saveConfig()
      })

      document.getElementById('pet-physics').addEventListener('change', (e) => {
        this.config.physics = e.target.checked; this.saveConfig()
      })

      // 图片上传
      document.querySelectorAll('.file-input').forEach((input) => {
        input.addEventListener('change', async (e) => {
          const file = e.target.files[0]
          if (!file) return
          const state = input.dataset.state
          const result = await this.imageManager.loadImage(file, state)
          this.say(result.message)
          this.updatePreviews()
          input.value = ''
        })
      })

      document.querySelectorAll('.btn-reset').forEach((btn) => {
        btn.addEventListener('click', () => {
          const state = btn.dataset.state
          this.imageManager.removeImage(state)
          this.updatePreviews()
          this.say('已恢复默认形象')
        })
      })

      document.getElementById('batch-import').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files)
        const states = ['idle', 'happy', 'surprised', 'sleep']
        for (let i = 0; i < Math.min(files.length, states.length); i++) {
          await this.imageManager.loadImage(files[i], states[i])
        }
        this.updatePreviews()
        this.say(`已导入 ${Math.min(files.length, states.length)} 张图片`)
        e.target.value = ''
      })

      document.getElementById('export-config').addEventListener('click', () => {
        const data = this.imageManager.exportConfig()
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'desktop-pet-config.json'
        a.click()
        URL.revokeObjectURL(url)
        this.say('配置已导出！')
      })

      document.getElementById('import-config').addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
          const result = this.imageManager.importConfig(ev.target.result)
          this.say(result.message)
          this.updatePreviews()
        }
        reader.readAsText(file)
        e.target.value = ''
      })

      document.getElementById('reset-all').addEventListener('click', () => {
        this.imageManager.removeAll()
        this.updatePreviews()
        this.say('已恢复所有默认形象')
      })

      // 迷你面板关闭按钮
      document.querySelectorAll('.close-mini-panel').forEach((btn) => {
        btn.addEventListener('click', () => {
          const panel = document.getElementById(btn.dataset.panel)
          if (panel) panel.classList.add('hidden')
        })
      })

      // ★ 番茄钟事件
      this.bindPomodoroEvents()

      // ★ 待办事件
      this.bindTodoEvents()

      // 窗口大小变化
      window.addEventListener('resize', () => this.clampPosition())
    }

    bindSlider(inputId, displayId, unit, callback) {
      const input = document.getElementById(inputId)
      const display = document.getElementById(displayId)
      input.addEventListener('input', () => {
        const v = parseInt(input.value)
        display.textContent = v + unit
        callback(v)
      })
    }

    // ========================================
    // 番茄钟
    // ========================================
    bindPomodoroEvents() {
      document.getElementById('pomodoro-start').addEventListener('click', () => this.pomodoroStart())
      document.getElementById('pomodoro-pause').addEventListener('click', () => this.pomodoroPause())
      document.getElementById('pomodoro-reset').addEventListener('click', () => this.pomodoroReset())
    }

    pomodoroStart() {
      const p = this.pomodoro
      if (p.isRunning && !p.isPaused) return

      if (!p.isRunning) {
        const workMin = parseInt(document.getElementById('pomodoro-work-min').value) || 25
        const breakMin = parseInt(document.getElementById('pomodoro-break-min').value) || 5
        p.workDuration = workMin * 60
        p.breakDuration = breakMin * 60
        p.remaining = p.workDuration
        p.isBreak = false
      }

      p.isRunning = true
      p.isPaused = false

      document.getElementById('pomodoro-start').disabled = true
      document.getElementById('pomodoro-pause').disabled = false
      document.getElementById('pomodoro-time').classList.add('active')

      this.say(p.isBreak ? '休息时间开始~ ☕' : '番茄钟开始！专注！🍅')

      if (p.interval) clearInterval(p.interval)
      p.interval = setInterval(() => this.pomodoroTick(), 1000)
    }

    pomodoroPause() {
      const p = this.pomodoro
      if (!p.isRunning) return

      p.isPaused = true
      clearInterval(p.interval)

      document.getElementById('pomodoro-start').disabled = false
      document.getElementById('pomodoro-pause').disabled = true
      document.getElementById('pomodoro-time').classList.remove('active')
      document.getElementById('pomodoro-status').textContent = '已暂停'

      this.say('番茄钟已暂停 ⏸')
    }

    pomodoroReset() {
      const p = this.pomodoro
      clearInterval(p.interval)
      p.isRunning = false
      p.isPaused = false
      p.isBreak = false
      p.remaining = (parseInt(document.getElementById('pomodoro-work-min').value) || 25) * 60

      document.getElementById('pomodoro-start').disabled = false
      document.getElementById('pomodoro-pause').disabled = true
      document.getElementById('pomodoro-time').classList.remove('active')
      this.updatePomodoroDisplay()
      document.getElementById('pomodoro-status').textContent = '准备开始'
    }

    pomodoroTick() {
      const p = this.pomodoro
      p.remaining--
      this.updatePomodoroDisplay()

      if (p.remaining <= 0) {
        clearInterval(p.interval)

        if (p.isBreak) {
          // 休息结束
          p.isBreak = false
          p.remaining = p.workDuration
          p.isRunning = false
          document.getElementById('pomodoro-start').disabled = false
          document.getElementById('pomodoro-pause').disabled = true
          document.getElementById('pomodoro-time').classList.remove('active')
          document.getElementById('pomodoro-status').textContent = '准备开始'
          this.say('休息结束！准备好再来一个番茄了吗？💪')
        } else {
          // 工作结束
          p.completed++
          p.isBreak = true
          p.remaining = p.breakDuration
          document.getElementById('pomodoro-completed').textContent = p.completed
          document.getElementById('pomodoro-status').textContent = '🎉 休息时间'
          this.say(`太棒了！完成了第 ${p.completed} 个番茄！休息一下~ 🍅🎉`)
          this.addAffection(10)

          const rect = this.container.getBoundingClientRect()
          this.particles.emit(rect.left + this.config.size / 2, rect.top, 'star', 12)

          // 自动开始休息
          p.interval = setInterval(() => this.pomodoroTick(), 1000)
        }
      }
    }

    updatePomodoroDisplay() {
      const min = Math.floor(this.pomodoro.remaining / 60)
      const sec = this.pomodoro.remaining % 60
      const timeStr = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
      document.getElementById('pomodoro-time').textContent = timeStr

      if (this.pomodoro.isRunning && !this.pomodoro.isPaused) {
        document.getElementById('pomodoro-status').textContent = this.pomodoro.isBreak ? '☕ 休息中' : '🍅 专注中'
      }
    }

    // ========================================
    // 待办事项
    // ========================================
    bindTodoEvents() {
      const input = document.getElementById('todo-input')
      const addBtn = document.getElementById('todo-add')

      const addTodo = () => {
        const text = input.value.trim()
        if (!text) return
        this.todos.push({ text, done: false, id: Date.now() })
        input.value = ''
        this.saveTodos()
        this.renderTodos()
        this.say('已添加任务~ 加油！📝')
      }

      addBtn.addEventListener('click', addTodo)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTodo()
      })
    }

    loadTodos() {
      try {
        const saved = localStorage.getItem(TODO_KEY)
        if (saved) this.todos = JSON.parse(saved)
      } catch { /* ignore */ }
    }

    saveTodos() {
      try {
        localStorage.setItem(TODO_KEY, JSON.stringify(this.todos))
      } catch { /* ignore */ }
    }

    renderTodos() {
      const list = document.getElementById('todo-list')
      const footer = document.getElementById('todo-footer')
      if (!list) return

      list.innerHTML = ''
      this.todos.forEach((todo, idx) => {
        const li = document.createElement('li')
        li.className = 'todo-item' + (todo.done ? ' done' : '')

        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.checked = todo.done
        cb.addEventListener('change', () => {
          this.todos[idx].done = cb.checked
          this.saveTodos()
          this.renderTodos()
          if (cb.checked) {
            this.say('完成了一项任务！太棒了！✅')
            this.addAffection(3)
          }
        })

        const span = document.createElement('span')
        span.className = 'todo-text'
        span.textContent = todo.text

        const del = document.createElement('button')
        del.className = 'todo-del'
        del.textContent = '✕'
        del.addEventListener('click', () => {
          this.todos.splice(idx, 1)
          this.saveTodos()
          this.renderTodos()
        })

        li.appendChild(cb)
        li.appendChild(span)
        li.appendChild(del)
        list.appendChild(li)
      })

      const total = this.todos.length
      const done = this.todos.filter(t => t.done).length
      if (footer) {
        footer.textContent = total > 0 ? `${done}/${total} 完成` : '暂无待办事项'
      }
    }

    // ========================================
    // 迷你面板定位
    // ========================================
    toggleMiniPanel(panelId) {
      const panel = document.getElementById(panelId)
      if (!panel) return

      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden')
        // 定位在桌宠旁边
        const rect = this.container.getBoundingClientRect()
        let left = rect.left - 290
        if (left < 10) left = rect.right + 10
        if (left + 280 > window.innerWidth) left = window.innerWidth - 290
        let top = rect.top
        if (top + 300 > window.innerHeight) top = window.innerHeight - 310

        panel.style.left = Math.max(10, left) + 'px'
        panel.style.top = Math.max(10, top) + 'px'
      } else {
        panel.classList.add('hidden')
      }
    }

    // ========================================
    // 随机语录
    // ========================================
    showRandomQuote() {
      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      this.say(quote)
      this.addAffection(1)
    }

    // ========================================
    // 交互行为
    // ========================================
    onPetClick() {
      this.lastInteraction = Date.now()
      this.animState.squish = 1
      this.animState.expression = 'happy'

      // 好感度增加
      this.addAffection(2)

      // 粒子特效
      const rect = this.container.getBoundingClientRect()
      const cx = rect.left + this.config.size / 2
      const cy = rect.top + this.config.size / 3
      this.particles.emit(cx, cy, 'heart', 5)

      const messages = [
        '喵~ 😺', '嘿嘿，别戳了~', '好舒服喵~',
        '喵呜！', '再摸摸嘛~', '(开心地转圈)',
        '你是我最喜欢的人~ ❤️', '摸头杀！',
      ]
      this.say(messages[Math.floor(Math.random() * messages.length)])

      setTimeout(() => {
        if (this.currentState !== 'sleeping') {
          this.animState.expression = 'idle'
        }
      }, 1500)
    }

    onPetDoubleClick() {
      this.lastInteraction = Date.now()
      this.animState.expression = 'surprised'
      this.animState.blushIntensity = 0.7
      this.endIdleBehavior()
      this.addAffection(3)

      const rect = this.container.getBoundingClientRect()
      this.particles.emit(rect.left + this.config.size / 2, rect.top + this.config.size / 3, 'star', 8)

      this.say('哇哦！！ 😲✨')

      setTimeout(() => {
        if (this.currentState !== 'sleeping') {
          this.animState.expression = 'idle'
        }
      }, 2000)
    }

    doWave() {
      this.currentState = 'waving'
      this.wavePhase = 0
      this.endIdleBehavior()
      this.say('你好呀~ 👋')
      this.addAffection(1)
      setTimeout(() => { this.currentState = 'idle' }, 2000)
    }

    doSpin() {
      this.currentState = 'spinning'
      this.spinAngle = 0
      this.endIdleBehavior()
      this.say('转圈圈~ 🌀')
      this.addAffection(1)
      setTimeout(() => { this.currentState = 'idle'; this.animState.rotation = 0 }, 1500)
    }

    // ★ 伸懒腰
    doStretch() {
      this.currentState = 'stretching'
      this.endIdleBehavior()
      this.say('好舒服~ 伸个懒腰！🙆')
      this.addAffection(1)
      let phase = 0
      const anim = setInterval(() => {
        phase += 0.04
        if (phase < Math.PI) {
          const t = Math.sin(phase)
          this.animState.pawLeftX = -t * 3
          this.animState.pawRightX = t * 3
          this.animState.pawLeftY = -t * 1.5
          this.animState.pawRightY = -t * 1.5
          this.animState.bodySwayY = -t * 0.5
          this.animState.mouthShape = 'yawn'
          this.animState.mouthOpen = t * 0.8
          this.animState.eyeOpen = 0.3
        } else {
          this.animState.pawLeftX *= 0.85
          this.animState.pawRightX *= 0.85
          this.animState.pawLeftY *= 0.85
          this.animState.pawRightY *= 0.85
          this.animState.bodySwayY *= 0.85
          this.animState.mouthOpen *= 0.85
        }
        if (phase > Math.PI * 1.5) {
          clearInterval(anim)
          this.animState.pawLeftX = 0; this.animState.pawRightX = 0
          this.animState.pawLeftY = 0; this.animState.pawRightY = 0
          this.animState.bodySwayY = 0; this.animState.mouthOpen = 0
          this.animState.mouthShape = 'auto'; this.animState.eyeOpen = 1
          this.currentState = 'idle'
        }
      }, 30)
    }

    // ★ 跳舞
    doDance() {
      this.currentState = 'dancing'
      this.endIdleBehavior()
      this.say('跳舞时间~ 💃🎵')
      this.addAffection(2)
      const rect = this.container.getBoundingClientRect()
      this.particles.emit(rect.left + this.config.size / 2, rect.top, 'note', 8)
      this.animState.expression = 'happy'
      let phase = 0
      const anim = setInterval(() => {
        phase += 0.06
        this.animState.bodySwayX = Math.sin(phase * 4) * 0.8
        this.animState.headBobY = Math.abs(Math.sin(phase * 3)) * -0.6
        this.animState.tilt = Math.sin(phase * 2) * 2
        this.animState.pawLeftY = Math.sin(phase * 6) * 0.5
        this.animState.pawRightY = Math.sin(phase * 6 + Math.PI) * 0.5
        this.animState.earTwitchL = Math.sin(phase * 8) * 0.5
        this.animState.earTwitchR = Math.sin(phase * 8 + 1) * 0.5
        if (phase > Math.PI * 3) {
          clearInterval(anim)
          this.animState.bodySwayX = 0; this.animState.headBobY = 0
          this.animState.tilt = 0; this.animState.pawLeftY = 0
          this.animState.pawRightY = 0; this.animState.earTwitchL = 0
          this.animState.earTwitchR = 0; this.animState.expression = 'idle'
          this.currentState = 'idle'
        }
      }, 30)
    }

    // ★ 跳跃
    doJump() {
      this.currentState = 'jumping'
      this.endIdleBehavior()
      this.say('跳！🦘')
      this.addAffection(1)
      this.animState.expression = 'happy'
      let phase = 0
      const anim = setInterval(() => {
        phase += 0.05
        this.animState.jumpPhase = Math.sin(phase * Math.PI)
        if (this.animState.jumpPhase > 0.3) {
          this.animState.pawLeftY = -1
          this.animState.pawRightY = -1
        } else {
          this.animState.pawLeftY *= 0.7
          this.animState.pawRightY *= 0.7
        }
        if (phase >= 1) {
          clearInterval(anim)
          this.animState.jumpPhase = 0
          this.animState.squish = 0.8
          this.animState.pawLeftY = 0; this.animState.pawRightY = 0
          this.animState.expression = 'idle'
          this.currentState = 'idle'
        }
      }, 25)
    }

    doSleep() {
      this.currentState = 'sleeping'
      this.animState.expression = 'sleep'
      this.animState.eyeOpen = 0
      this.endIdleBehavior()
      this.say('晚安~ 💤')
    }

    hidePet() {
      this.container.classList.add('hidden')
      this.showPetBtn.classList.remove('hidden')
    }

    showPet() {
      this.container.classList.remove('hidden')
      this.showPetBtn.classList.add('hidden')
      this.say('我回来啦~ 🐱')
    }

    resetPosition() {
      this.config.posX = window.innerWidth - this.config.size - 40
      this.config.posY = window.innerHeight - this.config.size - 40
      this.container.style.left = this.config.posX + 'px'
      this.container.style.top = this.config.posY + 'px'
      this.isPhysicsActive = false
      this.velocity = { x: 0, y: 0 }
      this.saveConfig()
      this.say('回到原位啦~')
    }

    clampPosition() {
      const maxX = window.innerWidth - this.config.size
      const maxY = window.innerHeight - this.config.size
      this.config.posX = Math.max(0, Math.min(this.config.posX, maxX))
      this.config.posY = Math.max(0, Math.min(this.config.posY, maxY))
      this.container.style.left = this.config.posX + 'px'
      this.container.style.top = this.config.posY + 'px'
    }

    say(text) {
      this.speechBubble.textContent = text
      this.speechBubble.classList.remove('below')
      this.speechBubble.classList.remove('hidden')
      this.speechBubble.classList.add('show')

      const petRect = this.container.getBoundingClientRect()
      const bubbleRect = this.speechBubble.getBoundingClientRect()
      const topSpace = petRect.top
      const bottomSpace = window.innerHeight - petRect.bottom
      if (bubbleRect.height + 12 > topSpace && bottomSpace > topSpace) {
        this.speechBubble.classList.add('below')
      }

      if (this.speechTimeout) clearTimeout(this.speechTimeout)
      this.speechTimeout = setTimeout(() => {
        this.speechBubble.classList.remove('show')
        setTimeout(() => {
          this.speechBubble.classList.add('hidden')
          this.speechBubble.classList.remove('below')
        }, 300)
      }, 3500)
    }

    // ========================================
    // 菜单
    // ========================================
    showContextMenu(x, y) {
      this.contextMenu.classList.remove('hidden')
      const margin = 10
      const menuW = this.contextMenu.offsetWidth
      const menuH = this.contextMenu.offsetHeight
      const maxLeft = Math.max(margin, window.innerWidth - menuW - margin)
      const maxTop = Math.max(margin, window.innerHeight - menuH - margin)
      this.contextMenu.style.left = Math.max(margin, Math.min(x, maxLeft)) + 'px'
      this.contextMenu.style.top = Math.max(margin, Math.min(y, maxTop)) + 'px'
    }

    hideContextMenu() {
      this.contextMenu.classList.add('hidden')
    }

    // ========================================
    // 设置面板
    // ========================================
    openSettings() {
      this.settingsPanel.classList.remove('hidden')
      this.updatePreviews()
      this.updateAffectionUI()
    }

    closeSettings() {
      this.settingsPanel.classList.add('hidden')
    }

    updatePreviews() {
      const states = ['idle', 'happy', 'surprised', 'sleep']
      const expressions = ['idle', 'happy', 'surprised', 'sleep']

      states.forEach((state, i) => {
        const previewEl = document.getElementById('preview-' + state)
        if (!previewEl) return
        const canvas = previewEl.querySelector('.preview-canvas')
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        canvas.width = 80 * dpr
        canvas.height = 80 * dpr

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const customImg = this.imageManager.getImage(state)
        if (customImg && customImg.complete) {
          ctx.drawImage(customImg, 0, 0, canvas.width, canvas.height)
        } else {
          ctx.save()
          const previewState = {
            breathe: 0,
            eyeOpen: state === 'sleep' ? 0 : 1,
            lookX: 0, lookY: 0, tilt: 0,
            expression: expressions[i],
            pawLeftX: 0, pawLeftY: 0,
            pawRightX: 0, pawRightY: 0,
            pupilDilation: 1, blushIntensity: 0.25,
            earTwitchL: 0, earTwitchR: 0,
            earFlatten: state === 'sleep' ? 0.8 : 0,
            tailSpeed: 1, tailAmplitude: 1,
            whiskerTwitch: 0, noseWiggle: 0,
            mouthOpen: 0, mouthShape: 'auto',
            bodySwayX: 0, bodySwayY: 0,
            headBobY: 0, jumpPhase: 0,
            eyeSparkle: 0,
          }
          DefaultCatRenderer.draw(ctx, 80 * dpr, previewState)
          ctx.restore()
        }
      })
    }

    // ========================================
    // 物理引擎
    // ========================================
    updatePhysics() {
      if (!this.isPhysicsActive) return

      this.velocity.y += this.gravity
      this.velocity.x *= this.friction
      this.velocity.y *= this.friction

      this.config.posX += this.velocity.x
      this.config.posY += this.velocity.y

      const maxX = window.innerWidth - this.config.size
      const maxY = window.innerHeight - this.config.size
      let bounced = false

      // 地面弹跳
      if (this.config.posY >= maxY) {
        this.config.posY = maxY
        this.velocity.y = -Math.abs(this.velocity.y) * this.bounceDamping
        this.velocity.x *= 0.9
        bounced = true
      }

      // 天花板
      if (this.config.posY <= 0) {
        this.config.posY = 0
        this.velocity.y = Math.abs(this.velocity.y) * this.bounceDamping
        bounced = true
      }

      // 左右墙壁
      if (this.config.posX <= 0) {
        this.config.posX = 0
        this.velocity.x = Math.abs(this.velocity.x) * this.bounceDamping
        bounced = true
      }
      if (this.config.posX >= maxX) {
        this.config.posX = maxX
        this.velocity.x = -Math.abs(this.velocity.x) * this.bounceDamping
        bounced = true
      }

      if (bounced) {
        this.animState.squish = 0.6
      }

      this.container.style.left = this.config.posX + 'px'
      this.container.style.top = this.config.posY + 'px'

      // 当速度足够小时停止物理
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2)
      if (speed < 0.5 && this.config.posY >= maxY - 1) {
        this.isPhysicsActive = false
        this.currentState = 'idle'
        this.animState.expression = 'idle'
        this.animState.rotation = 0
        this.velocity = { x: 0, y: 0 }
        this.clampPosition()
        this.say('呼... 平安着陆！😵‍💫')
        this.saveConfig()
      }
    }

    // ========================================
    // ★ 空闲行为系统
    // ========================================
    updateIdleBehavior(now, speedMul) {
      if (this.currentState !== 'idle') {
        if (this.idleBehavior !== 'none') this.endIdleBehavior()
        return
      }
      this.idleBehaviorTimer += 16
      if (this.idleBehavior === 'none') {
        if (this.idleBehaviorTimer >= this.nextIdleBehaviorTime) {
          const behaviors = ['earTwitch', 'lookAround', 'grooming', 'yawn', 'stretch', 'nod', 'kneading', 'tailChase']
          this.idleBehavior = behaviors[Math.floor(Math.random() * behaviors.length)]
          this.idleBehaviorPhase = 0
          this.idleBehaviorTimer = 0
          this.idleBehaviorDuration = 2500 + Math.random() * 3000
        }
        return
      }
      this.idleBehaviorPhase += 0.02 * speedMul
      switch (this.idleBehavior) {
        case 'earTwitch':
          this.animState.earTwitchL = Math.sin(this.idleBehaviorPhase * 25) * (1 - this.idleBehaviorPhase / 2) * 2
          this.animState.earTwitchR = Math.sin(this.idleBehaviorPhase * 25 + 1.5) * (1 - this.idleBehaviorPhase / 2) * 2
          break
        case 'lookAround':
          this.targetLookX = Math.sin(this.idleBehaviorPhase * 2.5) * 0.8
          this.targetLookY = Math.cos(this.idleBehaviorPhase * 1.8) * 0.3
          this.animState.earTwitchL = Math.sin(this.idleBehaviorPhase * 3) * 0.3
          this.animState.earTwitchR = Math.sin(this.idleBehaviorPhase * 3 + 2) * 0.3
          break
        case 'grooming':
          this.animState.pawLeftX = -Math.abs(Math.sin(this.idleBehaviorPhase * 5)) * 2.5
          this.animState.pawLeftY = -Math.abs(Math.sin(this.idleBehaviorPhase * 5)) * 1.5
          this.animState.expression = 'happy'
          this.targetLookX = -0.3
          this.animState.mouthShape = 'meow'
          this.animState.mouthOpen = Math.abs(Math.sin(this.idleBehaviorPhase * 8)) * 0.3
          break
        case 'yawn': {
          const yt = this.idleBehaviorPhase
          const yc = yt < 0.5 ? yt * 2 : yt < 1.2 ? 1 : Math.max(0, 1 - (yt - 1.2) * 2)
          this.animState.mouthOpen = yc
          this.animState.mouthShape = 'yawn'
          this.animState.eyeOpen = 0.15 + (1 - yc) * 0.3
          this.animState.earFlatten = yc * 0.5
          break
        }
        case 'stretch':
          this.animState.pawLeftX = -Math.sin(this.idleBehaviorPhase * 2) * 3
          this.animState.pawRightX = Math.sin(this.idleBehaviorPhase * 2) * 3
          this.animState.bodySwayY = -Math.sin(this.idleBehaviorPhase * 2) * 0.4
          break
        case 'nod':
          this.animState.headBobY = Math.sin(this.idleBehaviorPhase * 6) * 0.5
          this.animState.eyeOpen = 0.3 + Math.abs(Math.cos(this.idleBehaviorPhase * 3)) * 0.7
          break
        case 'kneading':
          this.animState.pawLeftY = Math.sin(this.idleBehaviorPhase * 8) * 0.6
          this.animState.pawRightY = Math.sin(this.idleBehaviorPhase * 8 + Math.PI) * 0.6
          this.animState.expression = 'happy'
          this.animState.eyeOpen = 0.6
          break
        case 'tailChase':
          this.animState.tailSpeed = 3
          this.animState.tailAmplitude = 2
          this.targetLookX = Math.sin(this.idleBehaviorPhase * 4) * 0.6
          this.animState.bodySwayX = Math.sin(this.idleBehaviorPhase * 3) * 0.4
          this.animState.expression = this.idleBehaviorPhase % 1 > 0.5 ? 'surprised' : 'happy'
          break
      }
      if (this.idleBehaviorTimer >= this.idleBehaviorDuration) {
        this.endIdleBehavior()
      }
    }

    endIdleBehavior() {
      this.idleBehavior = 'none'
      this.idleBehaviorTimer = 0
      this.nextIdleBehaviorTime = 5000 + Math.random() * 15000
      this.animState.mouthOpen = 0
      this.animState.mouthShape = 'auto'
      this.animState.earTwitchL = 0
      this.animState.earTwitchR = 0
      this.animState.headBobY = 0
      this.animState.bodySwayX = 0
      this.animState.bodySwayY = 0
      this.animState.tailSpeed = 1
      this.animState.tailAmplitude = 1
      this.animState.pawLeftX = 0
      this.animState.pawRightX = 0
      this.animState.pawLeftY = 0
      this.animState.pawRightY = 0
      if (this.currentState !== 'sleeping') {
        this.animState.expression = 'idle'
        this.animState.eyeOpen = 1
        this.animState.earFlatten = 0
      }
    }

    // ========================================
    // 动画循环（灵动增强）
    // ========================================
    requestFrame() {
      requestAnimationFrame(() => this.update())
    }

    update() {
      this.frameCount++
      const speedMul = this.config.speed / 100
      const now = Date.now()
      const timeSec = now / 1000

      // 呼吸动画
      this.animState.breathe = Math.sin(timeSec * 2 * speedMul) * 0.5

      // ★ 耳朵随机微动
      if (this.idleBehavior !== 'earTwitch' && this.idleBehavior !== 'lookAround') {
        this.animState.earTwitchL += ((Math.random() - 0.5) * 0.2 - this.animState.earTwitchL * 0.03) * speedMul
        this.animState.earTwitchR += ((Math.random() - 0.5) * 0.2 - this.animState.earTwitchR * 0.03) * speedMul
      }

      // ★ 瞳孔随情绪
      let targetPupil = 1
      if (this.animState.expression === 'surprised') targetPupil = 1.6
      else if (this.animState.expression === 'happy') targetPupil = 0.85
      else if (this.animState.expression === 'sleep') targetPupil = 0.5
      this.animState.pupilDilation += (targetPupil - this.animState.pupilDilation) * 0.08

      // ★ 腮红渐变
      const timeSinceClick = now - this.lastInteraction
      const targetBlush = timeSinceClick < 3000 ? 0.55 : 0.2
      this.animState.blushIntensity += (targetBlush - this.animState.blushIntensity) * 0.02

      // ★ 胡须微动
      this.animState.whiskerTwitch = timeSec * 0.5 + Math.sin(timeSec * 3) * 0.03

      // ★ 鼻子微动
      this.animState.noseWiggle = Math.sin(timeSec * 4) * 0.6

      // ★ 身体微摇（空闲）
      if (this.currentState === 'idle' && this.idleBehavior === 'none') {
        this.animState.bodySwayX += (Math.sin(timeSec * 0.5) * 0.2 - this.animState.bodySwayX) * 0.03
      }

      // ★ 眼睛闪烁
      if (this.animState.expression === 'happy' || this.affection.level >= 5) {
        this.animState.eyeSparkle = 0.3 + Math.sin(timeSec * 2) * 0.15
      } else {
        this.animState.eyeSparkle *= 0.93
      }

      // ★ 尾巴情绪联动
      if (this.idleBehavior !== 'tailChase') {
        let tSpd = 1, tAmp = 1
        if (this.animState.expression === 'happy') { tSpd = 2.5; tAmp = 1.8 }
        else if (this.animState.expression === 'surprised') { tSpd = 0.3; tAmp = 0.3 }
        else if (this.animState.expression === 'sleep') { tSpd = 0.2; tAmp = 0.3 }
        this.animState.tailSpeed += (tSpd - this.animState.tailSpeed) * 0.06
        this.animState.tailAmplitude += (tAmp - this.animState.tailAmplitude) * 0.06
      }

      // ★ 耳朵情绪联动
      if (this.idleBehavior !== 'yawn') {
        let targetFlatten = 0.1
        if (this.animState.expression === 'surprised') targetFlatten = 0
        else if (this.animState.expression === 'sleep') targetFlatten = 0.8
        else if (this.animState.expression === 'happy') targetFlatten = 0.15
        this.animState.earFlatten += (targetFlatten - this.animState.earFlatten) * 0.05
      }

      // 眨眼
      this.blinkTimer += 16 * speedMul
      if (this.blinkTimer > this.blinkInterval) {
        this.blinkTimer = 0
        this.blinkInterval = this.randomBlinkInterval()
        this.doBlink()
      }

      // 鼠标跟随
      if (this.config.follow && this.currentState !== 'sleeping' && this.currentState !== 'dragging' && this.currentState !== 'flying' && this.idleBehavior !== 'lookAround' && this.idleBehavior !== 'grooming' && this.idleBehavior !== 'tailChase') {
        const rect = this.container.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const dx = this.mousePos.x - centerX
        const dy = this.mousePos.y - centerY
        const maxDist = Math.max(window.innerWidth, window.innerHeight) * 0.5
        this.targetLookX = Math.max(-1, Math.min(1, dx / maxDist))
        this.targetLookY = Math.max(-1, Math.min(1, dy / maxDist))
        this.targetTilt = this.targetLookX * 3
      } else if (this.currentState === 'sleeping' || this.currentState === 'dragging' || this.currentState === 'flying') {
        this.targetLookX = 0
        this.targetLookY = 0
        this.targetTilt = 0
      }

      // 平滑插值
      const lerp = 0.08 * speedMul
      this.animState.lookX += (this.targetLookX - this.animState.lookX) * lerp
      this.animState.lookY += (this.targetLookY - this.animState.lookY) * lerp
      this.animState.tilt += (this.targetTilt - this.animState.tilt) * lerp

      // 挤压恢复
      if (this.animState.squish > 0) {
        this.animState.squish *= 0.9
        if (this.animState.squish < 0.01) this.animState.squish = 0
      }

      // 特殊状态更新
      if (this.currentState === 'waving') {
        this.wavePhase += 0.15 * speedMul
        this.animState.pawRightX = Math.sin(this.wavePhase * 5) * 1.5
        this.animState.pawRightY = -Math.abs(Math.sin(this.wavePhase * 3))
        if (this.wavePhase > Math.PI * 2) {
          this.animState.pawRightX = 0
          this.animState.pawRightY = 0
        }
      } else if (this.currentState === 'idle' || this.currentState === 'sleeping') {
        if (this.idleBehavior === 'none' && this.currentState !== 'sleeping') {
          this.animState.pawRightX *= 0.9
          this.animState.pawRightY *= 0.9
        }
      }

      if (this.currentState === 'spinning') {
        this.spinAngle += 12 * speedMul
        this.animState.rotation = this.spinAngle
        if (this.spinAngle >= 360) {
          this.animState.rotation = 0
          this.spinAngle = 0
        }
      }

      // 物理
      if (this.currentState === 'flying') {
        this.updatePhysics()
        this.animState.rotation = (this.animState.rotation + this.velocity.x * 1.2) % 360
      }

      // 自动入睡
      if (this.currentState === 'idle' && (now - this.lastInteraction) > this.config.sleepDelay * 1000) {
        this.currentState = 'sleeping'
        this.animState.expression = 'sleep'
        this.endIdleBehavior()
        this.say('好困... 💤')
      }

      if (this.currentState === 'sleeping') {
        this.animState.eyeOpen = Math.max(0, this.animState.eyeOpen - 0.05)
      }

      // ★ 空闲行为系统
      this.updateIdleBehavior(now, speedMul)

      // 随机语录
      this.quoteTimer += 16
      if (this.quoteTimer >= this.quoteInterval && this.currentState === 'idle') {
        this.quoteTimer = 0
        this.quoteInterval = 120000 + Math.random() * 180000
        this.showRandomQuote()
      }

      this.animState.customAnimPhase = timeSec * speedMul

      // 粒子 + 渲染
      this.particles.update()
      this.render()
      this.particles.render()
      this.requestFrame()
    }

    doBlink() {
      if (this.currentState === 'sleeping') return
      if (this.idleBehavior === 'yawn' || this.idleBehavior === 'nod') return
      const orig = this.animState.eyeOpen
      this.animState.eyeOpen = 0
      setTimeout(() => {
        if (this.currentState !== 'sleeping' && this.idleBehavior !== 'yawn') {
          this.animState.eyeOpen = orig || 1
        }
      }, 120 + Math.random() * 80)
    }

    randomBlinkInterval() {
      return 2000 + Math.random() * 4000
    }

    // ========================================
    // 渲染
    // ========================================
    render() {
      const { ctx, canvas } = this
      const size = Math.min(canvas.width, canvas.height)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()

      // 旋转
      if (this.animState.rotation) {
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((this.animState.rotation * Math.PI) / 180)
        ctx.translate(-canvas.width / 2, -canvas.height / 2)
      }

      // 挤压效果
      if (this.animState.squish > 0.01) {
        const sq = this.animState.squish * 0.15
        ctx.translate(canvas.width / 2, canvas.height)
        ctx.scale(1 + sq, 1 - sq)
        ctx.translate(-canvas.width / 2, -canvas.height)
      }

      const currentExpression = this.animState.expression || 'idle'
      const customImage = this.imageManager.getImage(currentExpression) || this.imageManager.getImage('idle')

      if (customImage && customImage.complete && customImage.naturalWidth > 0) {
        this.renderCustomImage(ctx, customImage, size)
      } else {
        DefaultCatRenderer.draw(ctx, size, this.animState)
      }

      ctx.restore()
    }

    renderCustomImage(ctx, img, size) {
      ctx.save()
      const floatY = this.animState.breathe * 4
      const tiltAngle = this.animState.tilt * 0.03

      ctx.translate(size / 2, size / 2 + floatY)
      ctx.rotate(tiltAngle)

      const scale = size / Math.max(img.naturalWidth, img.naturalHeight)
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale

      ctx.drawImage(img, -w / 2, -h / 2, w, h)
      ctx.restore()
    }
  }

  // ==========================================
  // 启动
  // ==========================================
  window.addEventListener('DOMContentLoaded', () => {
    new DesktopPet()
  })
})()
