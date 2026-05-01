import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Plus,
  Trash2,
  User,
} from 'lucide-react-native';

import { API_BASE_URL } from '../../config/config';

type Contact = {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  relation?: string;
};
type NavigationLike = {
  navigate: (screen: string) => void;
  replace: (screen: string) => void;
  goBack: () => void;
};
type Props = { navigation: NavigationLike };

const P = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  placeholder: '#D8B8BC',
  progressTrack: '#EDEDE8',
  red: '#C8102E',
  blue: '#155E8A',
  border: '#EBE7E1',
};

const AddEmergencyContacts: React.FC<Props> = ({ navigation }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relation: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.emergencyContacts) {
            setContacts(data.emergencyContacts);
          }
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, []);

  const removeContact = (idToRemove: string) => {
    setContacts(
      contacts.filter(contact => (contact._id || contact.id) !== idToRemove),
    );
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 10);
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length > 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(
        3,
        6,
      )}-${cleaned.slice(6)}`;
    }
    setNewContact({ ...newContact, phone: formatted });
  };

  const addContact = () => {
    const rawDigits = newContact.phone.replace(/\D/g, '');

    if (
      !newContact.name.trim() ||
      rawDigits.length !== 10 ||
      !newContact.relation
    ) {
      setErrorMessage(
        'Please enter a name, a 10-digit phone number, and a relationship.',
      );
      return;
    }

    setContacts([
      ...contacts,
      {
        id: Date.now().toString(),
        ...newContact,
        name: newContact.name.trim(),
      },
    ]);
    setNewContact({ name: '', phone: '', relation: '' });
    setErrorMessage('');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (contacts.length === 0) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emergencyContacts: contacts }),
      });

      if (response.ok) {
        navigation.navigate('CompleteMedicalProfile');
      } else {
        const err = await response.json();
        Alert.alert('Error', err.message || 'Failed to save contacts.');
      }
    } catch (error) {
      console.error('Save Crash:', error);
      Alert.alert('Error', 'Something went wrong. Check your terminal.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={P.red} />
        </View>
      </SafeAreaView>
    );
  }

  const canProceed = contacts.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={styles.progressBar} />
          <View style={styles.progressBar} />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.stepText}>STEP 2 OF 4: TRUSTED NETWORK</Text>
            <Text style={styles.title}>Emergency Contacts</Text>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{contacts.length}/5</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Add at least one trusted person. We will notify them immediately
          during an SOS event.
        </Text>

        {contacts.map(contact => {
          const uniqueKey = contact._id || contact.id;
          return (
            <View key={uniqueKey} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactTextBlock}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactDetails}>
                    {[contact.relation, contact.phone]
                      .filter(Boolean)
                      .join(' - ')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeContact(uniqueKey as string)}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <Trash2 color={P.red} size={20} />
              </TouchableOpacity>
            </View>
          );
        })}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {contacts.length < 5 ? (
          showAddForm ? (
            <View style={styles.addFormContainer}>
              <Text style={styles.formTitle}>Add New Contact</Text>

              <View style={styles.inputContainer}>
                <User color={P.muted} size={21} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  placeholderTextColor={P.placeholder}
                  value={newContact.name}
                  onChangeText={t => setNewContact({ ...newContact, name: t })}
                />
              </View>
              <View style={styles.inputContainer}>
                <Phone color={P.muted} size={21} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number *"
                  placeholderTextColor={P.placeholder}
                  keyboardType="phone-pad"
                  value={newContact.phone}
                  onChangeText={handlePhoneChange}
                  maxLength={14}
                />
              </View>

              <Text style={styles.relationLabel}>Relationship *</Text>
              <View style={styles.relationContainer}>
                {['Family', 'Friend'].map(relation => {
                  const isActive = newContact.relation === relation;
                  return (
                    <TouchableOpacity
                      key={relation}
                      style={[
                        styles.relationOption,
                        isActive && styles.relationOptionActive,
                      ]}
                      onPress={() => setNewContact({ ...newContact, relation })}
                    >
                      <Text
                        style={[
                          styles.relationText,
                          isActive && styles.relationTextActive,
                        ]}
                      >
                        {relation}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => {
                    setShowAddForm(false);
                    setErrorMessage('');
                  }}
                >
                  <Text style={styles.cancelFormText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitFormBtn}
                  onPress={addContact}
                >
                  <Text style={styles.submitFormText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addContactBtn}
              onPress={() => setShowAddForm(true)}
            >
              <Plus color={P.blue} size={22} />
              <Text style={styles.addContactText}>
                {contacts.length === 0
                  ? 'Add Your First Contact'
                  : 'Add Another Contact'}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.limitReachedBox}>
            <Text style={styles.limitReachedText}>
              You have reached the maximum limit of 5 contacts.
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !canProceed && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!canProceed}
          >
            <Text style={styles.saveButtonText}>Next: Medical Info</Text>
            <ArrowRight color="#FFFFFF" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34 },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
  progressContainer: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: P.progressTrack,
    borderRadius: 999,
  },
  progressActive: { backgroundColor: P.red },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: { flex: 1 },
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
  counterBadge: {
    backgroundColor: P.fieldBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    marginTop: 3,
  },
  counterText: { fontSize: 14, fontWeight: '800', color: P.textSecondary },
  subtitle: {
    fontSize: 15,
    color: P.textSecondary,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 22,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: P.card,
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '900', color: P.muted },
  contactTextBlock: { flex: 1, minWidth: 0 },
  contactName: {
    fontSize: 16,
    fontWeight: '800',
    color: P.textPrimary,
    marginBottom: 2,
  },
  contactDetails: { fontSize: 13, color: P.textSecondary },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addContactBtn: {
    backgroundColor: P.fieldBg,
    borderRadius: 18,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  addContactText: { color: P.textPrimary, fontSize: 16, fontWeight: '700' },
  limitReachedBox: { padding: 16, alignItems: 'center', marginTop: 8 },
  limitReachedText: { color: P.muted, fontSize: 14, fontStyle: 'italic' },
  addFormContainer: {
    backgroundColor: P.card,
    padding: 16,
    borderRadius: 18,
    marginTop: 6,
    borderWidth: 1,
    borderColor: P.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.textPrimary,
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.fieldBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 16, color: P.textPrimary, paddingVertical: 0 },
  relationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: P.textPrimary,
    marginBottom: 8,
  },
  relationContainer: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  relationOption: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: P.fieldBg,
  },
  relationOptionActive: { backgroundColor: P.textPrimary },
  relationText: { fontSize: 15, fontWeight: '700', color: P.textSecondary },
  relationTextActive: { color: '#FFFFFF' },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelFormBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  cancelFormText: { color: P.textSecondary, fontSize: 15, fontWeight: '700' },
  submitFormBtn: {
    backgroundColor: P.red,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  submitFormText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  buttonContainer: { marginTop: 28, marginBottom: 10 },
  saveButton: {
    backgroundColor: P.red,
    borderRadius: 20,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  saveButtonDisabled: { opacity: 0.48 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  errorText: {
    color: P.red,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 2,
  },
});

export default AddEmergencyContacts;
