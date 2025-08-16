import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

interface CueAssistantProps {
  onAction?: (action: string) => void;
  currentContext?: string;
}

const CueAssistant: React.FC<CueAssistantProps> = ({ onAction, currentContext = 'general' }) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState([
    {
      id: '1',
      type: 'assistant',
      message: 'Hello! I\'m Cue, your AI director assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  
  const slideAnim = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      // In production, this would use expo-speech-recognition or similar
      // For now, simulating voice input
      setTimeout(() => {
        const mockTranscript = 'Make the scene darker and change to a close-up shot';
        setInputText(mockTranscript);
        setIsListening(false);
        processUserInput(mockTranscript);
      }, 3000);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const processUserInput = async (input: string) => {
    if (!input.trim()) return;

    // Add user message to conversation
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: input,
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userMessage]);
    setInputText('');

    try {
      // Generate AI response (in production, this would call the backend)
      const response = await generateAIResponse(input);
      
      // Add AI response to conversation
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        message: response,
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, aiMessage]);

      // Speak the response
      if (Speech.isAvailableAsync()) {
        Speech.speak(response, {
          language: 'en-US',
          pitch: 1,
          rate: 0.9,
        });
      }

      // Process any actions from the response
      processCueActions(response);
    } catch (error) {
      console.error('Error processing user input:', error);
    }
  };

  const generateAIResponse = async (input: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerInput = input.toLowerCase();
    
    // Context-aware responses based on current workflow step
    if (lowerInput.includes('darker') || lowerInput.includes('dark')) {
      return `I'll make that scene darker for you. This will create more dramatic lighting and enhance the mood. Would you like me to adjust the brightness by 20% or would you prefer a different level?`;
    }
    
    if (lowerInput.includes('close-up') || lowerInput.includes('closeup')) {
      return `Perfect! A close-up shot will create more intimacy and focus on the subject. I'll update the storyboard to change that shot from a medium to a close-up. This will require regenerating the storyboard panel - would you like me to proceed?`;
    }
    
    if (lowerInput.includes('pacing') || lowerInput.includes('faster') || lowerInput.includes('slower')) {
      return `I can help improve the pacing. Based on your current storyboard, I recommend adjusting the shot duration in scene 3 from 4 seconds to 2.5 seconds to create more dynamic movement. Should I implement this change?`;
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('guidance')) {
      return `I'm here to help! You're currently in the ${currentContext} phase. I can help you iterate on your ideas, refine your storyboard, or guide you through the next steps. What specific aspect would you like assistance with?`;
    }
    
    if (lowerInput.includes('next') || lowerInput.includes('continue')) {
      return `Great! You're ready to move to the next step. Based on your current progress, you should proceed to ${getNextStep(currentContext)}. Would you like me to guide you through this transition?`;
    }
    
    // Default response
    return `I understand you want to ${input}. Let me analyze your current project context and provide specific recommendations. Could you give me a bit more detail about what you're trying to achieve?`;
  };

  const getNextStep = (context: string): string => {
    const stepFlow: Record<string, string> = {
      'ideation': 'storyboard creation',
      'storyboard': 'scene direction',
      'sceneDirection': 'auto-editor',
      'videoGeneration': 'test screening',
      'testScreening': 'project completion',
    };
    return stepFlow[context] || 'the next phase';
  };

  const processCueActions = (response: string) => {
    // Extract and execute any actions from the AI response
    if (response.includes('storyboard')) {
      onAction?.('regenerate_storyboard');
    }
    
    if (response.includes('scene') && (response.includes('darker') || response.includes('close-up'))) {
      onAction?.('update_scene');
    }
  };

  const quickActions = [
    { id: 'darker', label: 'Make scene darker', icon: 'brightness-2' },
    { id: 'closeup', label: 'Change to close-up', icon: 'crop-square' },
    { id: 'pacing', label: 'Improve pacing', icon: 'speed' },
  ];

  const handleQuickAction = (actionId: string) => {
    const actionMap: Record<string, string> = {
      'darker': 'Make the scene darker and more dramatic',
      'closeup': 'Change the medium shot to a close-up for more intimacy',
      'pacing': 'Analyze and improve the pacing of your current sequence',
    };
    
    const action = actionMap[actionId] || actionId;
    processUserInput(action);
  };

  return (
    <>
      {/* Floating Cue Button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={toggleVisibility}
      >
        <MaterialIcons name="smart-toy" size={24} color="white" />
      </TouchableOpacity>

      {/* Cue Assistant Interface */}
      <Animated.View
        style={[
          styles.cueInterface,
          {
            transform: [{ translateX: slideAnim }],
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="smart-toy" size={24} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                Cue Assistant
              </Text>
            </View>
            <TouchableOpacity onPress={toggleVisibility}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Conversation */}
          <View style={styles.conversation}>
            {conversation.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.message,
                  message.type === 'user' ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor:
                        message.type === 'user'
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color:
                          message.type === 'user'
                            ? 'white'
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {message.message}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionButton,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                onPress={() => handleQuickAction(action.id)}
              >
                <MaterialIcons name={action.icon as any} size={16} color={theme.colors.primary} />
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <View style={[styles.inputContainer, { borderColor: theme.colors.outline }]}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text }]}
                placeholder="Ask Cue anything..."
                placeholderTextColor={theme.colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isListening && { backgroundColor: theme.colors.error },
                ]}
                onPress={isListening ? stopListening : startListening}
              >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialIcons
                    name={isListening ? 'stop' : 'mic'}
                    size={20}
                    color="white"
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => processUserInput(inputText)}
            >
              <MaterialIcons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cueInterface: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 350,
    height: 600,
    borderTopLeftRadius: 20,
    borderWidth: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  conversation: {
    flex: 1,
    marginVertical: 16,
  },
  message: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 80,
    paddingVertical: 4,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CueAssistant;
