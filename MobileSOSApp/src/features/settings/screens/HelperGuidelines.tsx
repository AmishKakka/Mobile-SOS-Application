import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

type HelperGuidelinesProps = { route: { params?: { openSection?: string } } };

const HelperGuidelinesScreen: React.FC<HelperGuidelinesProps> = ({ route }) => {
  const initialSection = route.params?.openSection || 'community';
  const [expandedSection, setExpandedSection] = useState<string | null>(initialSection);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.headerBox}>
          <Text style={styles.emojiIcon}>📚</Text>
          <Text style={styles.title}>Helper Guidelines</Text>
          <Text style={styles.subtitle}>Everything you need to know to safely and effectively respond to community emergencies.</Text>
        </View>

        {/* 1. Community First Section */}
        <CollapsibleSection 
          title="Community First" 
          emoji="👥" 
          isExpanded={expandedSection === 'community'} 
          onPress={() => toggleSection('community')}
        >
          <PointerCard number="1" title="Keep Your Status Accurate" desc="Only toggle your status to 'Available' when you are genuinely in a position to drop what you are doing." />
          <PointerCard number="2" title="Learn Basic First Aid & CPR" desc="Knowing basic CPR and how to apply a tourniquet can keep a neighbor stable until 911 arrives." />
          <PointerCard number="3" title="Respect Privacy at All Times" desc="Never screenshot or share the sensitive medical data you are granted temporary access to." />
        </CollapsibleSection>

        {/* 2. Save Lives Section */}
        <CollapsibleSection 
          title="Save Lives (First Aid)" 
          emoji="📍" 
          isExpanded={expandedSection === 'savelives'} 
          onPress={() => toggleSection('savelives')}
        >
          <PointerCard number="1" title="Assess the Scene" desc="Before rushing in, ensure the area is safe for YOU. If there is a fire or violence, stay back." />
          <PointerCard number="2" title="Hands-Only CPR" desc="Push hard and fast in the center of the chest (about 100-120 pushes a minute) until help arrives." />
          <PointerCard number="3" title="Stop Severe Bleeding" desc="Apply firm, continuous pressure using a clean cloth or your hands. Do not remove pressure to check." />
          <PointerCard number="4" title="Do Not Move the Victim" desc="Unless there is an immediate threat to their life, never move a severely injured person." />
        </CollapsibleSection>

        {/* 3. Build Trust Section */}
        <CollapsibleSection 
          title="Build Trust" 
          emoji="🤝" 
          isExpanded={expandedSection === 'trust'} 
          onPress={() => toggleSection('trust')}
        >
          <PointerCard number="1" title="The 'Live Picture' Feature" desc="Take a quick selfie when accepting an SOS so the victim knows exactly who to look for." />
          <PointerCard number="2" title="Announce Yourself Clearly" desc="Keep hands visible and state, 'I am a SafeGuard Responder, I am here to help.'" />
          <PointerCard number="3" title="Respect Boundaries" desc="Always ask for consent before touching an injured person or applying first aid." />
        </CollapsibleSection>

      </ScrollView>
    </SafeAreaView>
  );
};

// --- SUB-COMPONENTS ---

type CollapsibleSectionProps = React.PropsWithChildren<{
  title: string;
  emoji: string;
  isExpanded: boolean | null;
  onPress: () => void;
}>;

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, emoji, isExpanded, onPress, children }) => (
  <View style={[styles.accordionContainer, isExpanded && styles.accordionContainerActive]}>
    <TouchableOpacity style={styles.accordionHeader} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.headerLeft}>
        <Text style={styles.accordionEmoji}>{emoji}</Text>
        <Text style={[styles.accordionTitle, isExpanded && styles.accordionTitleActive]}>{title}</Text>
      </View>
      <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    
    {isExpanded && (
      <View style={styles.accordionContent}>
        {children}
      </View>
    )}
  </View>
);

type PointerCardProps = { number: string; title: string; desc: string };

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

// --- STYLES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 20 },
  
  headerBox: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  emojiIcon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  // Accordion Styles
  accordionContainer: { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  accordionContainerActive: { borderColor: '#fca5a5', shadowColor: '#d32f2f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  accordionEmoji: { fontSize: 22, marginRight: 12 },
  accordionTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  accordionTitleActive: { color: '#d32f2f' },
  chevron: { fontSize: 16, color: '#9ca3af' },
  accordionContent: { padding: 20, paddingTop: 0, backgroundColor: '#ffffff' },

  // Pointer Card Styles
  pointerCard: { flexDirection: 'row', marginBottom: 20, paddingRight: 10, marginTop: 10 },
  numberCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', justifyContent: 'center', alignItems: 'center', marginRight: 16, marginTop: 2 },
  numberText: { color: '#d32f2f', fontSize: 14, fontWeight: 'bold' },
  textContainer: { flex: 1 },
  pointerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  pointerDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
});

export default HelperGuidelinesScreen;