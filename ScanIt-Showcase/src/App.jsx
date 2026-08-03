import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeatureFall from './components/FeatureFall'
import HowItWorks from './components/HowItWorks'
import Campuses from './components/Campuses'
import Team from './components/Team'
import Download from './components/Download'
import Footer from './components/Footer'
import SplashGate from './components/SplashGate'
import BackToTop from './components/BackToTop'

export default function App() {
  return (
    <>
      <SplashGate />
      <Navbar />
      <main>
        <Hero />
        <FeatureFall />
        <HowItWorks />
        <Campuses />
        <Team />
        <Download />
      </main>
      <Footer />
      <BackToTop />
    </>
  )
}
