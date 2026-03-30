import useStore from './store/index'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

export default function App() {
  const onboarded = useStore((s) => s.user.onboarded)
  return onboarded ? <Dashboard /> : <Onboarding />
}
