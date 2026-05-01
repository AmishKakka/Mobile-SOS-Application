import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Handshake,
  HeartPulse,
  Users,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type NavigationLike = {
  goBack: () => void;
};

type HelperGuidelinesProps = {
  navigation: NavigationLike;
  route: { params?: { openSection?: string } };
};

type CollapsibleSectionProps = React.PropsWithChildren<{
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onPress: () => void;
}>;

type PointerCardProps = {
  number: string;
  title: string;
  desc: string;
};

const P = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  red: '#C8102E',
  blue: '#155E8A',
  border: '#EBE7E1',
  success: '#0F9F6E',
};

const HelperGuidelinesScreen: React.FC<HelperGuidelinesProps> = ({
  navigation,
  route,
}) => {
  const initialSection = route.params?.openSection || 'community';
  const [expandedSection, setExpandedSection] = useState<string | null>(
    initialSection,
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerBox}>
          <View style={styles.headerIconCircle}>
            <BookOpen color={P.red} size={32} strokeWidth={2.3} />
          </View>
          <Text style={styles.stepText}>HELPER GUIDE</Text>
          <Text style={styles.title}>Helper Guidelines</Text>
          <Text style={styles.subtitle}>
            Everything you need to know to safely and effectively respond to
            community emergencies.
          </Text>
        </View>

        <CollapsibleSection
          title="Community First"
          icon={<Users color={P.blue} size={22} strokeWidth={2.3} />}
          isExpanded={expandedSection === 'community'}
          onPress={() => toggleSection('community')}
        >
          <PointerCard
            number="1"
            title="Keep Your Status Accurate"
            desc="Only toggle your status to available when you are genuinely in a position to drop what you are doing."
          />
          <PointerCard
            number="2"
            title="Learn Basic First Aid & CPR"
            desc="Knowing basic CPR and how to apply a tourniquet can keep a neighbor stable until 911 arrives."
          />
          <PointerCard
            number="3"
            title="Respect Privacy at All Times"
            desc="Never screenshot or share the sensitive medical data you are granted temporary access to."
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Save Lives"
          icon={<HeartPulse color={P.red} size={22} strokeWidth={2.3} />}
          isExpanded={expandedSection === 'savelives'}
          onPress={() => toggleSection('savelives')}
        >
          <PointerCard
            number="1"
            title="Assess the Scene"
            desc="Before rushing in, ensure the area is safe for you. If there is a fire or violence, stay back."
          />
          <PointerCard
            number="2"
            title="Hands-Only CPR"
            desc="Push hard and fast in the center of the chest, about 100-120 pushes a minute, until help arrives."
          />
          <PointerCard
            number="3"
            title="Stop Severe Bleeding"
            desc="Apply firm, continuous pressure using a clean cloth or your hands. Do not remove pressure to check."
          />
          <PointerCard
            number="4"
            title="Do Not Move the Victim"
            desc="Unless there is an immediate threat to their life, never move a severely injured person."
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Build Trust"
          icon={<Handshake color={P.success} size={22} strokeWidth={2.3} />}
          isExpanded={expandedSection === 'trust'}
          onPress={() => toggleSection('trust')}
        >
          <PointerCard
            number="1"
            title="The Live Picture Feature"
            desc="Take a quick selfie when accepting an SOS so the victim knows exactly who to look for."
          />
          <PointerCard
            number="2"
            title="Announce Yourself Clearly"
            desc="Keep hands visible and state, I am a SafeGuard Responder, I am here to help."
          />
          <PointerCard
            number="3"
            title="Respect Boundaries"
            desc="Always ask for consent before touching an injured person or applying first aid."
          />
        </CollapsibleSection>
      </ScrollView>
    </SafeAreaView>
  );
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onPress,
  children,
}) => {
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <View
      style={[
        styles.accordionContainer,
        isExpanded && styles.accordionContainerActive,
      ]}
    >
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.accordionIcon}>{icon}</View>
          <Text
            style={[
              styles.accordionTitle,
              isExpanded && styles.accordionTitleActive,
            ]}
          >
            {title}
          </Text>
        </View>
        <ChevronIcon color={isExpanded ? P.red : P.muted} size={22} />
      </TouchableOpacity>

      {isExpanded && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );
};

const PointerCard: React.FC<PointerCardProps> = ({ number, title, desc }) => (
  <View style={styles.pointerCard}>
    <View style={styles.numberCircle}>
      <Text style={styles.numberText}>{number}</Text>
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.pointerTitle}>{title}</Text>
      <Text style={styles.pointerDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34 },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
  headerBox: { marginBottom: 22 },
  headerIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: P.border,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.blue,
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: P.textPrimary,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: P.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  accordionContainer: {
    backgroundColor: P.card,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  accordionContainerActive: {
    borderColor: '#F2B5BE',
    shadowColor: P.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: P.card,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  accordionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accordionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: P.textPrimary,
    flex: 1,
  },
  accordionTitleActive: { color: P.red },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 4 },
  pointerCard: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingTop: 4,
    paddingRight: 4,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE8EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  numberText: { color: P.red, fontSize: 14, fontWeight: '900' },
  textContainer: { flex: 1, minWidth: 0 },
  pointerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: P.textPrimary,
    marginBottom: 4,
  },
  pointerDesc: {
    fontSize: 14,
    color: P.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default HelperGuidelinesScreen;
