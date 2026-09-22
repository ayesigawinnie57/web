import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

type PaymentModalProps = {
  url: string
  onClose: () => void
}

export default function PaymentModal({ url, onClose }: PaymentModalProps) {
  if (Platform.OS !== 'web' || !url) return null

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close payment">
          <Text style={styles.closeText}>x</Text>
        </Pressable>
        {require('react').createElement('iframe', {
          src: url,
          title: 'Pesapal payment',
          allow: 'payment',
          style: styles.iframe,
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'fixed' as any, inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { position: 'relative', width: '100%', maxWidth: 720, height: '90%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 24, elevation: 12 },
  closeButton: { position: 'absolute', zIndex: 2, top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 5, elevation: 4 },
  closeText: { color: '#071A2B', fontSize: 22, lineHeight: 24, fontWeight: '700' },
  iframe: { width: '100%', height: '100%', borderWidth: 0 },
})
