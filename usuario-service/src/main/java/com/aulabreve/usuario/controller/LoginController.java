package com.aulabreve.usuario.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginController {

    private final String frontendOrigin;

    public LoginController(@Value("${app.auth.frontend-origin}") String frontendOrigin) {
        this.frontendOrigin = frontendOrigin;
    }

    @GetMapping("/login")
    public String login(Model model) {
        model.addAttribute("registroUrl", frontendOrigin + "/usuarios/registro");
        model.addAttribute("inicioUrl", frontendOrigin + "/usuarios/ingreso");
        return "login";
    }
}
