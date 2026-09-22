import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Image, Modal, StyleSheet, Text, View } from 'react-native'
import { Check, Circle } from 'lucide-react-native'
import { C, LOGO } from '../theme'

export type Portal = 'admin' | 'trader' | 'store'

type Props = {
  from: Portal
  to: Portal
  userName: string
  accountName: string
  onDone: () => void
}

const META: Record<Portal, { label: string; sub: string; color: string; bg: string; pages: string[] }> = {
  admin: { label: 'Admin Panel', sub: 'Management & Analytics', color: '#F97316', bg: '#071A2B', pages: ['Dashboard', 'Products', 'Orders', 'Users', 'Payments', 'Accounting', 'Inventory', 'Settings'] },
  trader: { label: 'Trader Portal', sub: 'Your Business Dashboard', color: '#22C55E', bg: '#061A10', pages: ['Dashboard', 'Products', 'Orders', 'Sales', 'Accounting', 'Inventory', 'Flash Sales', 'Settings'] },
  store: { label: 'Majo Store', sub: 'Shopping Experience', color: '#6366F1', bg: '#071A2B', pages: ['Home', 'Shop', 'Categories', 'Deals', 'Cart', 'Wishlist', 'Orders', 'Account'] },
}

const TICK_START = 800
const TICK_END = 7200
const EXIT_AT = 7800
const DONE_AT = 9200

export default function SwitchTransition({ from, to, userName, accountName, onDone }: Props) {
  const meta = META[to]
  const fromMeta = META[from]
  const [phase, setPhase] = useState<'enter' | 'loading' | 'ready'>('enter')
  const [completed, setCompleted] = useState(-1)
  const progress = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current
  const initials = useMemo(() => userName.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'UN', [userName])

  useEffect(() => {
    const interval = (TICK_END - TICK_START) / meta.pages.length
    const timers = [
      setTimeout(() => setPhase('loading'), TICK_START),
      ...meta.pages.map((_, index) => setTimeout(() => setCompleted(index), TICK_START + index * interval)),
      setTimeout(() => {
        setPhase('ready')
        Animated.timing(fade, { toValue: 0, duration: 800, useNativeDriver: true }).start()
      }, EXIT_AT),
      setTimeout(onDone, DONE_AT),
    ]
    Animated.timing(progress, { toValue: 1, duration: EXIT_AT, easing: Easing.linear, useNativeDriver: false }).start()
    return () => timers.forEach(clearTimeout)
  }, [fade, meta.pages, onDone, progress])

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { backgroundColor: meta.bg, opacity: fade }]}>
        <View style={styles.topbar}>
          <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" />
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
            <Text style={styles.statusText}>{phase === 'enter' ? 'Verifying session...' : phase === 'loading' ? 'Loading workspace...' : 'Ready'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.moduleBlock}>
            <Text style={styles.moduleLabel}>Initializing modules</Text>
            {meta.pages.map((page, index) => {
              const done = completed >= index
              return (
                <View key={page} style={[styles.moduleRow, done && { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}45` }]}>
                  {done ? <Check size={14} color="#fff" /> : <Circle size={14} color="rgba(255,255,255,0.25)" />}
                  <Text style={[styles.moduleText, done && styles.moduleTextDone]}>{page}</Text>
                  {done && <Text style={[styles.readyText, { color: meta.color }]}>READY</Text>}
                </View>
              )
            })}
          </View>

          <View style={styles.identityBlock}>
            <Text style={styles.eyebrow}>{accountName}</Text>
            <Text style={styles.switching}>Switching to</Text>
            <Text style={styles.title}>{meta.label}</Text>
            <Text style={styles.subtitle}>{meta.sub}</Text>

            <View style={styles.portalRow}>
              <View style={styles.portalBox}><Text style={styles.portalCaption}>From</Text><Text style={[styles.portalName, { color: fromMeta.color }]}>{fromMeta.label}</Text></View>
              <Text style={[styles.arrow, { color: meta.color }]}>→</Text>
              <View style={[styles.portalBox, styles.portalBoxActive, { borderColor: `${meta.color}88` }]}><Text style={styles.portalCaption}>To</Text><Text style={[styles.portalName, { color: meta.color }]}>{meta.label}</Text></View>
            </View>

            <View style={styles.userCard}>
              <View style={[styles.avatar, { backgroundColor: `${meta.color}88`, borderColor: `${meta.color}cc` }]}><Text style={styles.avatarText}>{initials}</Text></View>
              <View style={styles.userCopy}><Text style={styles.userName} numberOfLines={1}>{userName}</Text><Text style={styles.userStatus}>{phase === 'ready' ? 'Ready to go' : 'Authenticated session'}</Text></View>
              <Text style={[styles.activeText, { color: meta.color }]}>{phase === 'ready' ? 'Done' : 'Active'}</Text>
            </View>

            <View style={styles.progressHeader}><Text style={styles.progressLabel}>Progress</Text><Text style={[styles.progressValue, { color: meta.color }]}>{completed < 0 ? 0 : Math.round(((completed + 1) / meta.pages.length) * 100)}%</Text></View>
            <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { backgroundColor: meta.color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  logo: { width: 104, height: 30, opacity: 0.9 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  identityBlock: { justifyContent: 'center', flex: 1 },
  eyebrow: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 22 },
  switching: { color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 5 },
  title: { color: '#fff', fontSize: 23, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 5 },
  portalRow: { flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 16 },
  portalBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  portalBoxActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  portalCaption: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  portalName: { fontSize: 14, fontWeight: '800' },
  arrow: { display: 'none' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  userCopy: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  userStatus: { color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 3 },
  activeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 7 },
  progressLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600' },
  progressValue: { fontSize: 10, fontWeight: '800' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  moduleBlock: { maxHeight: 150, paddingTop: 6, overflow: 'hidden' },
  moduleLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 9 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 29, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', marginBottom: 3 },
  moduleText: { flex: 1, color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  moduleTextDone: { color: '#fff', fontWeight: '700' },
  readyText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
})
