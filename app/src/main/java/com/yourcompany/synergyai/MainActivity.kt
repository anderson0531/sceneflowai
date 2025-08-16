package com.yourcompany.synergyai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import dagger.hilt.android.AndroidEntryPoint
import com.yourcompany.synergyai.ui.navigation.NavGraph
import com.yourcompany.synergyai.viewmodel.RoleViewModel
import com.yourcompany.synergyai.ui.theme.SynergyAITheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val roleViewModel: RoleViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SynergyAITheme {
                NavGraph(roleViewModel = roleViewModel)
            }
        }
    }
} 