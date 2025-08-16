package com.yourcompany.synergyai.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.yourcompany.synergyai.ui.screens.LoginScreen
import com.yourcompany.synergyai.ui.screens.TeamMemberDashboard
import com.yourcompany.synergyai.ui.screens.ManagerDashboard
import com.yourcompany.synergyai.viewmodel.RoleViewModel

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object TeamMemberDashboard : Screen("team_member_dashboard")
    object ManagerDashboard : Screen("manager_dashboard")
}

@Composable
fun NavGraph(roleViewModel: RoleViewModel) {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onRoleSelected = { role ->
                    roleViewModel.setRole(role)
                    when (role) {
                        "TeamMember" -> navController.navigate(Screen.TeamMemberDashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                        "Manager" -> navController.navigate(Screen.ManagerDashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                }
            )
        }
        composable(Screen.TeamMemberDashboard.route) {
            TeamMemberDashboard()
        }
        composable(Screen.ManagerDashboard.route) {
            ManagerDashboard()
        }
    }
} 