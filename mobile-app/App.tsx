import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import BYOKSetupScreen from './src/screens/BYOKSetupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProjectScreen from './src/screens/ProjectScreen';
import IdeationScreen from './src/screens/IdeationScreen';
import StoryboardScreen from './src/screens/StoryboardScreen';
import SceneDirectionScreen from './src/screens/SceneDirectionScreen';
import VideoGenerationScreen from './src/screens/VideoGenerationScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreditsScreen from './src/screens/CreditsScreen';

// Import components
import CueAssistant from './src/components/CueAssistant';
import { AuthProvider } from './src/contexts/AuthContext';
import { CreditProvider } from './src/contexts/CreditContext';
import { BYOKProvider } from './src/contexts/BYOKContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

// Import theme
import { darkTheme, lightTheme } from './src/theme/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#888',
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Projects" 
        component={ProjectScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="folder" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Credits" 
        component={CreditsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="credit-card" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Tab Bar Icon Component
function TabBarIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <TabBarIcon name={name} color={color} size={size} />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PaperProvider theme={darkTheme}>
          <AuthProvider>
            <CreditProvider>
              <BYOKProvider>
                <StripeProvider publishableKey="your_stripe_publishable_key">
                  <NavigationContainer theme={darkTheme}>
                    <StatusBar style="light" />
                    
                    <Stack.Navigator
                      initialRouteName="Onboarding"
                      screenOptions={{
                        headerStyle: {
                          backgroundColor: '#1a1a1a',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                          fontWeight: 'bold',
                        },
                      }}
                    >
                      {/* Onboarding Flow */}
                      <Stack.Screen 
                        name="Onboarding" 
                        component={OnboardingScreen}
                        options={{ headerShown: false }}
                      />
                      
                      {/* Authentication */}
                      <Stack.Screen 
                        name="Login" 
                        component={LoginScreen}
                        options={{ headerShown: false }}
                      />
                      
                      {/* Subscription & Setup */}
                      <Stack.Screen 
                        name="Subscription" 
                        component={SubscriptionScreen}
                        options={{ title: 'Choose Your Plan' }}
                      />
                      
                      <Stack.Screen 
                        name="BYOKSetup" 
                        component={BYOKSetupScreen}
                        options={{ title: 'API Key Setup' }}
                      />
                      
                      {/* Main App */}
                      <Stack.Screen 
                        name="MainApp" 
                        component={MainTabs}
                        options={{ headerShown: false }}
                      />
                      
                      {/* Workflow Screens */}
                      <Stack.Screen 
                        name="Ideation" 
                        component={IdeationScreen}
                        options={{ title: 'Video Ideation' }}
                      />
                      
                      <Stack.Screen 
                        name="Storyboard" 
                        component={StoryboardScreen}
                        options={{ title: 'Storyboard' }}
                      />
                      
                      <Stack.Screen 
                        name="SceneDirection" 
                        component={SceneDirectionScreen}
                        options={{ title: 'Scene Direction' }}
                      />
                      
                      <Stack.Screen 
                        name="VideoGeneration" 
                        component={VideoGenerationScreen}
                        options={{ title: 'Video Generation' }}
                      />
                      
                      <Stack.Screen 
                        name="Analysis" 
                        component={AnalysisScreen}
                        options={{ title: 'Video Analysis' }}
                      />
                    </Stack.Navigator>
                    
                    {/* Global Cue Assistant */}
                    <CueAssistant />
                  </NavigationContainer>
                </StripeProvider>
              </BYOKProvider>
            </CreditProvider>
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
