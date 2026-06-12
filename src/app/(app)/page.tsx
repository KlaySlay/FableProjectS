import HomeClassic from './_HomeClassic'
import HomePreview from './_HomePreview'

export default function Home() {
  return process.env.NEXT_PUBLIC_HOME_V2 === 'true' ? <HomePreview /> : <HomeClassic />
}
