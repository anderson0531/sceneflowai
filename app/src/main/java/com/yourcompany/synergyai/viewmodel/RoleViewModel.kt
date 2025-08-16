package com.yourcompany.synergyai.viewmodel

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.State

@HiltViewModel
class RoleViewModel @Inject constructor() : ViewModel() {
    private val _role = mutableStateOf<String?>(null)
    val role: State<String?> = _role

    fun setRole(role: String) {
        _role.value = role
    }
} 