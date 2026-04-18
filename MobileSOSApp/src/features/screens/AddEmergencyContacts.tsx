import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../../config/config';
import { fetchAuthSession } from 'aws-amplify/auth';

type Contact = { _id?: string; id?: string; name: string; phone: string; relation?: string };
type NavigationLike = { navigate: (screen: string) => void; replace: (screen: string) => void };
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
        <ActivityIndicator size="large" color="#DC2626" />
      </SafeAreaView>
    );
  }

  // Requires at least 1 contact to proceed
  const canProceed = contacts.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.headerRow}>
          <Text style={styles.header}>Emergency Contacts</Text>
          <Text style={styles.counter}>{contacts.length}/5</Text>
        </View>
        <Text style={styles.subtitle}>You must add at least one contact to notify during an SOS alert.</Text>

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
              <TouchableOpacity onPress={() => removeContact(uniqueKey as string)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* The inline error message */}
        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelFormBtn}
            onPress={() => {
              setShowAddForm(false);
              setErrorMessage(""); // Clear error if they cancel
            }}
          >
            <Text style={styles.cancelFormText}>Cancel</Text>
          </TouchableOpacity>

        {/* Add Contact Form */}
        {contacts.length < 5 ? (
          showAddForm ? (
            <View style={styles.addFormContainer}>
              <Text style={styles.formTitle}>Add New Contact</Text>
              
              <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#9ca3af" value={newContact.name} onChangeText={(t) => setNewContact({...newContact, name: t})} />
              <TextInput style={styles.input} placeholder="Phone Number *" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={newContact.phone} onChangeText={handlePhoneChange} maxLength={14} />
              
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
                <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setShowAddForm(false)}>
                  <Text style={styles.cancelFormText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitFormBtn} onPress={addContact}>
                  <Text style={styles.submitFormText}>Add Contact</Text>
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

        <TouchableOpacity 
          style={[styles.saveButton, !canProceed && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!canProceed}
        >
          <Text style={styles.saveButtonText}>Next: Medical Info</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 24 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  counter: { fontSize: 16, fontWeight: '700', color: '#d32f2f', backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },

  contactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  contactInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4b5563' },
  contactName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  contactDetails: { fontSize: 13, color: '#6b7280' },
  removeBtn: { padding: 8 },
  removeBtnText: { color: '#d32f2f', fontSize: 14, fontWeight: '600' },

  addContactBtn: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, backgroundColor: '#ffffff' },
  addContactText: { color: '#4b5563', fontSize: 15, fontWeight: '600' },
  
  limitReachedBox: { padding: 16, alignItems: 'center', marginTop: 8 },
  limitReachedText: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },

  addFormContainer: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 12 },
  
  // Custom Relation Selector Styles
  relationLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  relationContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  relationOption: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#f9fafb' },
  relationOptionActive: { borderColor: '#111827', backgroundColor: '#e5e7eb' },
  relationText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  relationTextActive: { color: '#111827' },

  formActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelFormBtn: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  cancelFormText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
  submitFormBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  submitFormText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  saveButton: { backgroundColor: '#d32f2f', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  saveButtonDisabled: { backgroundColor: "#fca5a5" },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  errorText: { 
    color: '#DC2626', 
    fontSize: 13, 
    fontWeight: '600', 
    marginBottom: 8,
    marginTop: 4
  },

});

export default EmergencyContactsScreen;