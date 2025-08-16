package com.yourcompany.synergyai.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(onRoleSelected: (String) -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Select your role", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(32.dp))
            Button(onClick = { onRoleSelected("TeamMember") }, modifier = Modifier.fillMaxWidth(0.7f)) {
                Text("Team Member")
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { onRoleSelected("Manager") }, modifier = Modifier.fillMaxWidth(0.7f)) {
                Text("Manager")
            }
        }
    }
} 