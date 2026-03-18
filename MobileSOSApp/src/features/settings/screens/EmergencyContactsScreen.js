import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';

const EmergencyContactsScreen = () => {
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Sarah Mason', phone: '(555) 987-6543', relation: 'Mother' },
    { id: '2', name: 'Robert Mason', phone: '(555) 123-4567', relation: 'Father' }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });

  // Handle removing a contact
  const removeContact = (idToRemove) => {
    setContacts(contacts.filter(contact => contact.id !== idToRemove));
  };

  // Handle adding a new contact
  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      // In a real app, use a proper alert or toast here
      console.log("Please fill out the name and phone number.");
      return;
    }

    const contactToAdd = {
      id: Date.now().toString(),
      ...newContact
    };

    setContacts([...contacts, contactToAdd]);
    setNewContact({ name: '', phone: '', relation: '' }); 
    setShowAddForm(false); // Hide form
  };

  const handleSave = () => {
    console.log("Saving contacts to MongoDB...", contacts);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.headerRow}>
          <Text style={styles.header}>Emergency Contacts</Text>
          {/* Dynamic counter showing x/5 */}
          <Text style={styles.counter}>{contacts.length}/5</Text>
        </View>
        <Text style={styles.subtitle}>These contacts will be notified immediately via SMS when you trigger an SOS alert.</Text>

        {/* List of Current Contacts */}
        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDetails}>{contact.relation} • {contact.phone}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeContact(contact.id)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Contact Button / Form */}
        {contacts.length < 5 ? (
          showAddForm ? (
            <View style={styles.addFormContainer}>
              <Text style={styles.formTitle}>Add New Contact</Text>
              
              <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9ca3af" value={newContact.name} onChangeText={(t) => setNewContact({...newContact, name: t})} />
              <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={newContact.phone} onChangeText={(t) => setNewContact({...newContact, phone: t})} />
              <TextInput style={styles.input} placeholder="Relationship (e.g., Sister, Friend)" placeholderTextColor="#9ca3af" value={newContact.relation} onChangeText={(t) => setNewContact({...newContact, relation: t})} />
              
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
              <Text style={styles.addContactText}>+ Add Another Contact</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.limitReachedBox}>
            <Text style={styles.limitReachedText}>You have reached the maximum limit of 5 contacts.</Text>
          </View>
        )}

        {/* Global Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
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

  // Contact Card Styles
  contactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  contactInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4b5563' },
  contactName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  contactDetails: { fontSize: 13, color: '#6b7280' },
  removeBtn: { padding: 8 },
  removeBtnText: { color: '#d32f2f', fontSize: 14, fontWeight: '600' },

  // Add Button Styles
  addContactBtn: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, backgroundColor: '#ffffff' },
  addContactText: { color: '#4b5563', fontSize: 15, fontWeight: '600' },
  
  limitReachedBox: { padding: 16, alignItems: 'center', marginTop: 8 },
  limitReachedText: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },

  addFormContainer: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 12 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelFormBtn: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  cancelFormText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
  submitFormBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  submitFormText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  saveButton: { backgroundColor: '#d32f2f', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});

export default EmergencyContactsScreen;