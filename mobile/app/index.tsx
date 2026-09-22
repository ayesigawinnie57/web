import { ScrollView, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Hero from './landing/CategoryHero'
import Products from './landing/Products'
import FlashDeals from './landing/FlashDeals'
import Categories from './landing/Categories'
import Recommended from './landing/Recommended'

export default function Index() {
  const insets = useSafeAreaInsets()

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
      >
        <Hero />
        <Products />
        <FlashDeals />
        <Categories />
        <Recommended />
      </ScrollView>
    </>
  )
}
