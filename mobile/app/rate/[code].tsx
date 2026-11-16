import { useState, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Star, Truck, Bike, Smile, MessageSquare, Package, Headphones, CheckCircle } from 'lucide-react-native'
import { C } from '../theme'
import { ordersApi } from '../lib/products'

type Area = { key: string; label: string; icon: any }

const AREAS: Area[] = [
  { key: 'delivery_speed',      label: 'Delivery Speed',        icon: Truck         },
  { key: 'delivery_experience', label: 'Delivery Experience',   icon: Bike          },
  { key: 'delivery_person',     label: 'Delivery Person',       icon: Smile         },
  { key: 'communication',       label: 'Communication & Updates', icon: MessageSquare },
  { key: 'order_handling',      label: 'Order Handling',        icon: Package       },
  { key: 'customer_service',    label: 'Customer Service',      icon: Headphones    },
]

const OVERALL_LABELS: Record<number, string> = {
  1: 'Very Poor', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent',
}

const TOTAL_STEPS = 4

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Star size={32} color="#F59E0B" fill={i <= value ? '#F59E0B' : 'transparent'} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

function SmallStarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Star size={26} color="#F59E0B" fill={i <= value ? '#F59E0B' : 'transparent'} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function RateServiceScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState(1)
  const [overall, setOverall] = useState(0)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [areaRatings, setAreaRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleArea = (key: string) => {
    const next = selectedAreas.includes(key)
      ? selectedAreas.filter(k => k !== key)
      : [...selectedAreas, key]
    setSelectedAreas(next)
    // auto-advance only when exactly one area is selected
    if (next.length === 1) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => setStep(3), 400)
    } else {
      // cancel any pending advance if user deselects
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }

  const setAreaRating = (key: string, val: number) => {
    const updated = { ...areaRatings, [key]: val }
    setAreaRatings(updated)
    // auto-advance when every selected area now has a rating
    const allDone = selectedAreas.length > 0 && selectedAreas.every(k => (updated[k] ?? 0) > 0)
    if (allDone) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => setStep(4), 400)
    }
  }

  const pickOverall = (val: number) => {
    setOverall(val)
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => setStep(2), 500)
  }

  const allAreaRated = selectedAreas.length > 0 && selectedAreas.every(k => (areaRatings[k] ?? 0) > 0)

  const canNext =
    (step === 1 && overall > 0) ||
    (step === 2 && selectedAreas.length > 0) ||
    (step === 3 && allAreaRated) ||
    step === 4

  const goBack = () => {
    if (step > 1) setStep(prev => prev - 1)
    else if (router.canGoBack()) router.back()
    else router.replace('/notifications' as any)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await ordersApi.rateService(code, { overall, areas: selectedAreas, area_ratings: areaRatings, comment })
      setDone(true)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Could not submit. Please try again.'
      Alert.alert('Error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <View style={s.doneIconWrap}>
          <CheckCircle size={48} color={C.green} />
        </View>
        <Text style={s.doneTitle}>Thank You!</Text>
        <Text style={s.doneSub}>Your feedback helps Majo Market improve our service and give you an even better shopping experience.</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/' as any)}>
          <Text style={s.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <ArrowLeft size={20} color={C.navy} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Rate Our Service</Text>
        <Text style={s.stepLabel}>{step} of {TOTAL_STEPS}</Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Overall rating ── */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>How would you rate your Majo experience?</Text>
            <Text style={s.stepSub}>Your feedback helps us improve our service.</Text>
            <StarRow value={overall} onChange={pickOverall} />
            {overall > 0 && (
              <Text style={s.overallLabel}>{OVERALL_LABELS[overall]}</Text>
            )}
          </View>
        )}

        {/* ── Step 2: Select areas ── */}
        {step === 2 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>What would you like to rate?</Text>
            <Text style={s.stepSub}>Select one or more areas of our service.</Text>
            <View style={s.areaGrid}>
              {AREAS.map(({ key, label, icon: Icon }) => {
                const active = selectedAreas.includes(key)
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.areaChip, active && s.areaChipActive]}
                    onPress={() => toggleArea(key)}
                    activeOpacity={0.8}
                  >
                    <Icon size={18} color={active ? C.green : C.muted} />
                    <Text style={[s.areaChipText, active && s.areaChipTextActive]}>{label}</Text>
                    {active && <View style={s.areaCheck}><CheckCircle size={14} color={C.green} /></View>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Step 3: Rate each selected area ── */}
        {step === 3 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Rate each area</Text>
            <Text style={s.stepSub}>Tap the stars for each service area you selected.</Text>
            <View style={s.areaRatingList}>
              {selectedAreas.map(key => {
                const area = AREAS.find(a => a.key === key)!
                const Icon = area.icon
                return (
                  <View key={key} style={s.areaRatingRow}>
                    <View style={s.areaRatingLabel}>
                      <Icon size={16} color={C.muted} />
                      <Text style={s.areaRatingName}>{area.label}</Text>
                    </View>
                    <SmallStarRow value={areaRatings[key] ?? 0} onChange={v => setAreaRating(key, v)} />
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Step 4: Optional comment ── */}
        {step === 4 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Tell us more</Text>
            <Text style={s.stepSub}>What did we do well, or what could we improve?</Text>
            <TextInput
              style={s.commentInput}
              multiline
              numberOfLines={5}
              placeholder="Share your experience with Majo..."
              placeholderTextColor={C.mutedLight}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[s.submitBtn, submitting && { opacity: 0.7 }]}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnText}>Submit Feedback</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} onPress={handleSubmit} disabled={submitting}>
              <Text style={s.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Continue button — step 2 multi-select, and step 3 when multiple areas rated */}
      {(step === 2 && selectedAreas.length > 1) && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={s.nextBtn} onPress={() => setStep(3)}>
            <Text style={s.nextBtnText}>Continue — {selectedAreas.length} selected</Text>
          </TouchableOpacity>
        </View>
      )}
      {(step === 3 && selectedAreas.length > 1 && allAreaRated) && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={s.nextBtn} onPress={() => setStep(4)}>
            <Text style={s.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.navy },
  stepLabel: { fontSize: 12, color: C.mutedLight, fontWeight: '600' },

  progressBar: { height: 3, backgroundColor: C.border },
  progressFill: { height: 3, backgroundColor: C.green },

  scroll: { padding: 24, paddingBottom: 120 },

  stepWrap: { gap: 16 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: C.navy, lineHeight: 26 },
  stepSub: { fontSize: 13, color: C.muted, lineHeight: 20, marginTop: -8 },

  starRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  overallLabel: { fontSize: 15, fontWeight: '700', color: '#F59E0B', marginTop: -4 },

  areaGrid: { gap: 10 },
  areaChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 14 },
  areaChipActive: { borderColor: C.green, backgroundColor: '#F0FDF4' },
  areaChipText: { flex: 1, fontSize: 14, color: C.muted, fontWeight: '600' },
  areaChipTextActive: { color: C.navy, fontWeight: '700' },
  areaCheck: { marginLeft: 'auto' },

  areaRatingList: { gap: 16 },
  areaRatingRow: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, gap: 10 },
  areaRatingLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  areaRatingName: { fontSize: 13, fontWeight: '700', color: C.navy },

  commentInput: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, fontSize: 14, color: C.navy, minHeight: 120, lineHeight: 22 },
  submitBtn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { fontSize: 13, color: C.mutedLight, fontWeight: '600' },

  footer: { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 20, paddingTop: 12 },
  nextBtn: { backgroundColor: C.navy, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: C.border },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  doneIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: C.navy, marginBottom: 8 },
  doneSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  doneBtn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
