import Phone from '@phosphor-icons/core/assets/fill/phone-fill.svg?raw'
import EnvelopeSimple from '@phosphor-icons/core/assets/fill/envelope-simple-fill.svg?raw'
import MapPin from '@phosphor-icons/core/assets/fill/map-pin-fill.svg?raw'
import LinkedinLogo from '@phosphor-icons/core/assets/fill/linkedin-logo-fill.svg?raw'
import GithubLogo from '@phosphor-icons/core/assets/fill/github-logo-fill.svg?raw'
import GlobeSimple from '@phosphor-icons/core/assets/fill/globe-simple-fill.svg?raw'
import LinkSimple from '@phosphor-icons/core/assets/fill/link-simple-fill.svg?raw'
import Briefcase from '@phosphor-icons/core/assets/fill/briefcase-fill.svg?raw'
import CalendarCheck from '@phosphor-icons/core/assets/fill/calendar-check-fill.svg?raw'
import NavigationArrow from '@phosphor-icons/core/assets/fill/navigation-arrow-fill.svg?raw'
import GraduationCap from '@phosphor-icons/core/assets/fill/graduation-cap-fill.svg?raw'
import Star from '@phosphor-icons/core/assets/fill/star-fill.svg?raw'
import Trophy from '@phosphor-icons/core/assets/fill/trophy-fill.svg?raw'
import Translate from '@phosphor-icons/core/assets/fill/translate-fill.svg?raw'
import Code from '@phosphor-icons/core/assets/fill/code-fill.svg?raw'
import Cpu from '@phosphor-icons/core/assets/fill/cpu-fill.svg?raw'
import Brain from '@phosphor-icons/core/assets/fill/brain-fill.svg?raw'
import Lightning from '@phosphor-icons/core/assets/fill/lightning-fill.svg?raw'
import Target from '@phosphor-icons/core/assets/fill/target-fill.svg?raw'
import House from '@phosphor-icons/core/assets/fill/house-fill.svg?raw'
import Car from '@phosphor-icons/core/assets/fill/car-fill.svg?raw'
import Airplane from '@phosphor-icons/core/assets/fill/airplane-fill.svg?raw'
import BookOpen from '@phosphor-icons/core/assets/fill/book-open-fill.svg?raw'
import Certificate from '@phosphor-icons/core/assets/fill/certificate-fill.svg?raw'
import User from '@phosphor-icons/core/assets/fill/user-fill.svg?raw'
import ChatCircle from '@phosphor-icons/core/assets/fill/chat-circle-fill.svg?raw'
import Heart from '@phosphor-icons/core/assets/fill/heart-fill.svg?raw'
import Flag from '@phosphor-icons/core/assets/fill/flag-fill.svg?raw'
import Compass from '@phosphor-icons/core/assets/fill/compass-fill.svg?raw'
import Rocket from '@phosphor-icons/core/assets/fill/rocket-fill.svg?raw'

export const ICONS: Record<string, string> = {
  'phone': Phone,
  'envelope-simple': EnvelopeSimple,
  'map-pin': MapPin,
  'linkedin-logo': LinkedinLogo,
  'github-logo': GithubLogo,
  'globe-simple': GlobeSimple,
  'link-simple': LinkSimple,
  'briefcase': Briefcase,
  'calendar-check': CalendarCheck,
  'navigation-arrow': NavigationArrow,
  'graduation-cap': GraduationCap,
  'star': Star,
  'trophy': Trophy,
  'translate': Translate,
  'code': Code,
  'cpu': Cpu,
  'brain': Brain,
  'lightning': Lightning,
  'target': Target,
  'house': House,
  'car': Car,
  'airplane': Airplane,
  'book-open': BookOpen,
  'certificate': Certificate,
  'user': User,
  'chat-circle': ChatCircle,
  'heart': Heart,
  'flag': Flag,
  'compass': Compass,
  'rocket': Rocket,
}

export const CONTACT_ICON: Record<string, string> = { phone: 'phone', email: 'envelope-simple', location: 'map-pin', linkedin: 'linkedin-logo', github: 'github-logo', website: 'globe-simple', other: 'link-simple' }

export const iconSvg = (name: string) => (ICONS[name] ?? '').replace(/<svg[^>]*>/, '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">')
