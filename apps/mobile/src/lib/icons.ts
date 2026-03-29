import { I18nManager } from "react-native";
import {
  ArrowLeft as _ArrowLeft,
  ArrowRight as _ArrowRight,
  ChevronLeft as _ChevronLeft,
  ChevronRight as _ChevronRight,
} from "lucide-react-native";

// Directional icons — swapped in RTL
export const ArrowLeft = I18nManager.isRTL ? _ArrowRight : _ArrowLeft;
export const ArrowRight = I18nManager.isRTL ? _ArrowLeft : _ArrowRight;
export const ChevronLeft = I18nManager.isRTL ? _ChevronRight : _ChevronLeft;
export const ChevronRight = I18nManager.isRTL ? _ChevronLeft : _ChevronRight;

// Vertical icons — no swap
export { ChevronDown, ChevronUp } from "lucide-react-native";

// All other icons — direct export
export {
  AlertCircle,
  BarChart3,
  Bell,
  BellRing,
  Bookmark,
  BookmarkCheck,
  Building,
  Check,
  CheckCircle,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  Filter,
  Globe,
  Home,
  Image,
  Info,
  Layers,
  Link2,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Palette,
  PenLine,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
  X,
  XCircle,
  Zap,
} from "lucide-react-native";
