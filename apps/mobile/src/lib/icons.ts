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
  BarChart3,
  Bell,
  Bookmark,
  Check,
  ExternalLink,
  FileText,
  Globe,
  Home,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react-native";
