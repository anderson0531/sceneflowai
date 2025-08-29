package com.yourcompany.synergyai.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourcompany.synergyai.ui.components.Header

@Composable
fun TeamMemberDashboard() {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Header with Help link instead of New Project button
        Header(
            onHelpClick = {
                // TODO: Implement help functionality
            },
            onLogoutClick = {
                // TODO: Implement logout functionality
            }
        )
        
        // Main content
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Team Member Dashboard", style = MaterialTheme.typography.headlineMedium)
                Spacer(modifier = Modifier.height(16.dp))
                Text("Welcome! Your tasks and project info will appear here.")
            }
        }
    }
} 