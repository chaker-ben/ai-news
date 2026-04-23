// lib/icons.tsx — Proxy RTL pour toutes les icônes
// Importer TOUJOURS depuis ce fichier, jamais depuis lucide-react-native directement
import { I18nManager } from "react-native";
import {
  ArrowLeft as _ArrowLeft,
  ArrowRight as _ArrowRight,
  ChevronLeft as _ChevronLeft,
  ChevronRight as _ChevronRight,
} from "lucide-react-native";

// Icônes directionnelles — swappées automatiquement en RTL
export const ArrowLeft    = I18nManager.isRTL ? _ArrowRight   : _ArrowLeft;
export const ArrowRight   = I18nManager.isRTL ? _ArrowLeft    : _ArrowRight;
export const ChevronLeft  = I18nManager.isRTL ? _ChevronRight : _ChevronLeft;
export const ChevronRight = I18nManager.isRTL ? _ChevronLeft  : _ChevronRight;

// Icônes verticales — pas de swap
export { ChevronDown, ChevronUp } from "lucide-react-native";

// Les autres — ajouter ici au fur et à mesure des besoins
export {
  Check, X, Search, Settings, Bell, Home, User, Menu,
  Trash2, Edit, Plus, Minus, Eye, EyeOff, Star, Heart,
  Phone, Mail, MapPin, Calendar, Clock, AlertTriangle, Info,
  CheckCircle, XCircle, Download, Upload, Lock, Unlock,
} from "lucide-react-native";
