import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../../config/config';
import { fetchAuthSession } from 'aws-amplify/auth';

type Contact = { _id?: string; id?: string; name: string; phone: string; relation?: string };
type NavigationLike = { 
  navigate: (screen: string) => void; 
  replace: (screen: string) => void; 
  goBack: () => void; // 🚨 Added this!
};
type Props = { navigation: NavigationLike };

const EmergencyContactsScreen: React.FC<Props> = ({ navigation }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // FETCH CONTACTS ON LOAD
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.emergencyContacts) {
            setContacts(data.emergencyContacts);
          }
        }
      } catch (error) {
        console.error("Failed to load contacts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, []);

  const removeContact = (idToRemove: string) => {
    setContacts(contacts.filter(contact => (contact._id || contact.id) !== idToRemove));
  };

  // AUTO-FORMATTER for the contact form
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 10);
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length > 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    setNewContact({ ...newContact, phone: formatted });
  };

  const addContact = () => {
    const rawDigits = newContact.phone.replace(/\D/g, '');
    
    if (!newContact.name || rawDigits.length !== 10 || !newContact.relation) {
      setErrorMessage("Please enter a Name, a 10-digit Phone, and a Relationship.");
      return;
    }

    const contactToAdd = {
      id: Date.now().toString(),
      ...newContact
    };

    setContacts([...contacts, contactToAdd]);
    setNewContact({ name: '', phone: '', relation: '' }); 
    setErrorMessage("");
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emergencyContacts: contacts })
      });

      if (response.ok) {
        navigation.navigate('CompleteMedicalProfile');
      } else {
        const err = await response.json();
        Alert.alert("Error", err.message || "Failed to save contacts.");
      }
    } catch (error) {
      console.error("Save Crash:", error);
      Alert.alert("Error", "Something went wrong. Check your terminal.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#C82027" />
      </SafeAreaView>
    );
  }

  const canProceed = contacts.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Top Nav & Progress */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={styles.progressBar} />
        </View>

        <View style={styles.headerRow}>
            <View>
                <Text style={styles.stepText}>STEP 2 OF 3: TRUSTED NETWORK</Text>
                <Text style={styles.title}>Emergency Contacts</Text>
            </View>
            <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{contacts.length}/5</Text>
            </View>
        </View>
        <Text style={styles.subtitle}>You must add at least one contact. We will notify them immediately during an SOS event.</Text>

        {/* List of Current Contacts */}
        {contacts.map((contact) => {
          const uniqueKey = contact._id || contact.id; 
          return (
            <View key={uniqueKey} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactDetails}>{contact.relation} • {contact.phone}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeContact(uniqueKey as string)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* The inline error message */}
        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {/* Add Contact Form */}
        {contacts.length < 5 ? (
          showAddForm ? (
            <View style={styles.addFormContainer}>
              <Text style={styles.formTitle}>Add New Contact</Text>
              
              <View style={styles.inputContainer}>
                 <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#c2b9b4" value={newContact.name} onChangeText={(t) => setNewContact({...newContact, name: t})} />
              </View>
              <View style={styles.inputContainer}>
                 <TextInput style={styles.input} placeholder="Phone Number *" placeholderTextColor="#c2b9b4" keyboardType="phone-pad" value={newContact.phone} onChangeText={handlePhoneChange} maxLength={14} />
              </View>
              
              {/* Custom Relationship Selector */}
              <Text style={styles.relationLabel}>Relationship *</Text>
              <View style={styles.relationContainer}>
                <TouchableOpacity 
                  style={[styles.relationOption, newContact.relation === 'Family' && styles.relationOptionActive]} 
                  onPress={() => setNewContact({...newContact, relation: 'Family'})}
                >
                  <Text style={[styles.relationText, newContact.relation === 'Family' && styles.relationTextActive]}>Family</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.relationOption, newContact.relation === 'Friend' && styles.relationOptionActive]} 
                  onPress={() => setNewContact({...newContact, relation: 'Friend'})}
                >
                  <Text style={[styles.relationText, newContact.relation === 'Friend' && styles.relationTextActive]}>Friend</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelFormBtn} onPress={() => { setShowAddForm(false); setErrorMessage(""); }}>
                  <Text style={styles.cancelFormText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitFormBtn} onPress={addContact}>
                  <Text style={styles.submitFormText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddForm(true)}>
              <Text style={styles.addContactText}>{contacts.length === 0 ? "+ Add Your First Contact" : "+ Add Another Contact"}</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.limitReachedBox}>
            <Text style={styles.limitReachedText}>You have reached the maximum limit of 5 contacts.</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
            <TouchableOpacity 
            style={[styles.saveButton, !canProceed && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={!canProceed}
            >
            <Text style={styles.saveButtonText}>Next: Medical Info →</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  scroll: { padding: 24 },
  
  backButton: { marginBottom: 20, marginTop: 10 },
  backIcon: { fontSize: 24, color: "#1A1A1A" },

  progressContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#EBEBE6', borderRadius: 2 },
  progressActive: { backgroundColor: '#C82027' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  stepText: { fontSize: 12, fontWeight: "700", color: "#1E6594", marginBottom: 8, letterSpacing: 0.5 },
  title: { fontSize: 32, fontWeight: "800", color: "#1A1A1A" },
  
  counterBadge: { backgroundColor: '#F2F2EC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 4 },
  counterText: { fontSize: 14, fontWeight: '700', color: '#6B625B' },
  
  subtitle: { fontSize: 16, color: "#6B625B", lineHeight: 22, marginBottom: 24 },

  contactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  contactInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4F4F0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#8b7a73' },
  contactName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  contactDetails: { fontSize: 14, color: '#6B625B' },
  removeBtnText: { color: '#C82027', fontSize: 18, fontWeight: '800', padding: 8 },

  addContactBtn: { backgroundColor: '#F4F4F0', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  addContactText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
  
  limitReachedBox: { padding: 16, alignItems: 'center', marginTop: 8 },
  limitReachedText: { color: '#8b7a73', fontSize: 14, fontStyle: 'italic' },

  addFormContainer: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  inputContainer: { backgroundColor: '#F4F4F0', borderRadius: 14, paddingHorizontal: 16, height: 56, justifyContent: 'center', marginBottom: 12 },
  input: { fontSize: 16, color: '#1A1A1A' },
  
  relationLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8, marginTop: 4 },
  relationContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  relationOption: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#F4F4F0' },
  relationOptionActive: { backgroundColor: '#1A1A1A' },
  relationText: { fontSize: 15, fontWeight: '600', color: '#6B625B' },
  relationTextActive: { color: '#FFFFFF' },

  formActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelFormBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  cancelFormText: { color: '#6B625B', fontSize: 15, fontWeight: '600' },
  submitFormBtn: { backgroundColor: '#C82027', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  submitFormText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  buttonContainer: { marginTop: 32, marginBottom: 40 },
  saveButton: { backgroundColor: "#C82027", borderRadius: 14, paddingVertical: 18, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "white", fontSize: 17, fontWeight: "700" },

  errorText: { color: '#C82027', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 8, marginLeft: 4 },
});

export default EmergencyContactsScreen;