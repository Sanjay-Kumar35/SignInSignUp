document.addEventListener("DOMContentLoaded", () => {
  /* ---------------- Firebase Config ---------------- */
  const firebaseConfig = {
    apiKey: "AIzaSyDHdork03pWYmqm7Rf4l0djewRygDlywVw",
    authDomain: "sign-up-sign-in-83278.firebaseapp.com",
    projectId: "sign-up-sign-in-83278",
    storageBucket: "sign-up-sign-in-83278.appspot.com",
    messagingSenderId: "835450736571",
    appId: "1:835450736571:web:d26a061a5017ffce337e9e",
    measurementId: "G-YVTM3NT80Z"
  };

  // Initialize once (defensive)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  auth.languageCode = 'en';

  /* ---------------- Grab UI Elements ---------------- */
  const container          = document.getElementById("container");
  const successCard        = document.getElementById("successCard");
  const logoutBtn          = document.getElementById("logoutBtn");
  const closeSuccess       = document.getElementById("closeSuccess");
  const signupForm         = document.getElementById("signupForm");
  const signupNameEl       = document.getElementById("signupName");
  const signupEmailEl      = document.getElementById("signupEmail");
  const signupPasswordEl   = document.getElementById("signupPassword");
  const loginForm          = document.getElementById("loginForm");
  const loginEmailEl       = document.getElementById("loginEmail");
  const loginPasswordEl    = document.getElementById("loginPassword");
  const registerToggleBtn  = document.getElementById("register");
  const loginToggleBtn     = document.getElementById("login");
  const googleLoginBtn     = document.getElementById("googleLogin");
  const googleSignupBtn    = document.getElementById("googleSignup");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotModal        = document.getElementById("forgotModal");
  const closeModal         = document.getElementById("closeModal");
  const resetBtn           = document.getElementById("resetBtn");
  const resetEmailEl       = document.getElementById("resetEmail");

  /* ---------------- Utilities ---------------- */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showSuccess(message) {
    if (!successCard) return;
    successCard.querySelector("p").innerText = message;
    successCard.classList.add("show");
  }

  function hideSuccess() {
    if (!successCard) return;
    successCard.classList.remove("show");
  }

  function gotoSignUp(prefillEmail = "", prefillName = "") {
    container?.classList.add("active");
    if (prefillEmail) signupEmailEl.value = prefillEmail;
    if (prefillName)  signupNameEl.value  = prefillName;
    signupPasswordEl.focus();
  }

  function friendlyError(err) {
    console.error("Firebase Auth Error:", err);
    switch (err.code) {
      case 'auth/wrong-password':
        alert("Wrong password. Try again or use 'Forgot password'.");
        break;
      case 'auth/user-not-found':
        alert("No user found with that email. Please Sign Up.");
        break;
      case 'auth/invalid-email':
        alert("Invalid email format.");
        break;
      case 'auth/invalid-credential':
        alert("This account is linked to a different sign-in provider. Use Google or reset your password.");
        break;
      case 'auth/popup-closed-by-user':
        alert("Popup closed before signing in.");
        break;
      case 'auth/popup-blocked':
        alert("Popup blocked by browser. Allow popups and try again.");
        break;
      default:
        alert(err.message || "Authentication error.");
    }
  }

  function currentUserProviders() {
    const user = auth.currentUser;
    return user ? user.providerData.map(p => p.providerId) : [];
  }

  function userHasPasswordProvider() {
    return currentUserProviders().includes('password');
  }

  /* ---------------- Auth State Listener ---------------- */
  auth.onAuthStateChanged((user) => {
    if (user) {
      const name = user.displayName || user.email;
      let msg = `Welcome ${name}! You are logged in.`;
      if (user.email && !user.emailVerified) {
        msg += " (Verify your email.)";
      }
      showSuccess(msg);
    } else {
      hideSuccess();
    }
  });

  /* ---------------- Panel Toggles ---------------- */
  registerToggleBtn?.addEventListener("click", () => container?.classList.add("active"));
  loginToggleBtn?.addEventListener("click",   () => container?.classList.remove("active"));

  /* ---------------- Success Card Close / Logout ---------------- */
  closeSuccess?.addEventListener("click", hideSuccess);

  logoutBtn?.addEventListener("click", () => {
    auth.signOut()
      .then(() => {
        hideSuccess();
        alert("You have been logged out.");
      })
      .catch(friendlyError);
  });

  /* ---------------- Google Sign-In ---------------- */
  function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then((result) => {
        const name = result.user.displayName || "User";
        if (loginEmailEl) loginEmailEl.value = result.user.email || "";
        showSuccess(`Google login successful! Welcome ${name}.`);
      })
      .catch(friendlyError);
  }

  googleLoginBtn?.addEventListener("click", (e) => { e.preventDefault(); googleSignIn(); });
  googleSignupBtn?.addEventListener("click", (e) => { e.preventDefault(); googleSignIn(); });

  /* ---------------- Email/Password Sign Up ---------------- */
  signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name     = signupNameEl.value.trim();
    const email    = signupEmailEl.value.trim();
    const password = signupPasswordEl.value;

    if (!validateEmail(email))       return alert("Invalid email address");
    if (password.length < 6)         return alert("Password must be at least 6 characters.");

    auth.createUserWithEmailAndPassword(email, password)
      .then((cred) => cred.user.updateProfile({ displayName: name || email.split("@")[0] }).then(() => cred.user))
      .then((user) => user.sendEmailVerification())
      .then(() => {
        showSuccess("Account created! Verification email sent. Please check your inbox.");
        container?.classList.remove("active");
      })
      .catch(friendlyError);
  });

  /* ---------------- Email/Password Login ---------------- */
  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email    = loginEmailEl.value.trim();
    const password = loginPasswordEl.value;

    if (!validateEmail(email)) {
      alert("Please enter a valid email.");
      return;
    }

    // Already logged in with the same email?
    const curUser = auth.currentUser;
    if (curUser && curUser.email && curUser.email.toLowerCase() === email.toLowerCase()) {
      if (userHasPasswordProvider()) {
        showSuccess("You are already logged in!");
      } else {
        alert("You are logged in with Google. Use the Google button or add a password (via Forgot Password).");
      }
      return;
    }

    auth.fetchSignInMethodsForEmail(email)
      .then((methods) => {
        console.log("[Auth] Methods for", email, "=>", methods);

        if (methods.length === 0) {
          if (confirm("No account found with this email. Create one now?")) {
            gotoSignUp(email, email.split("@")[0]);
          }
          throw new Error("no-account");
        }

        if (!methods.includes('password') && methods.includes('google.com')) {
          alert("This email is linked to Google Sign-In. Use the Google button.");
          throw new Error("google-only");
        }

        return auth.signInWithEmailAndPassword(email, password);
      })
      .then((cred) => {
        if (!cred) return;
        if (!cred.user.emailVerified) {
          showSuccess("Logged in, but email not verified. Please check your inbox.");
        } else {
          showSuccess("Login successful!");
        }
      })
      .catch((err) => {
        if (err.message === "no-account" || err.message === "google-only") return;
        friendlyError(err);
      });
  });

  /* ---------------- Add Password to a Google Account ---------------- */
  function linkPasswordToCurrentUser(newPassword) {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a password.");
      return;
    }
    if (!user.email) {
      alert("No email available for this account.");
      return;
    }
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, newPassword);
    user.linkWithCredential(credential)
      .then(() => {
        alert("Password added! You can now sign in with email + password.");
      })
      .catch(friendlyError);
  }

  /* ---------------- Forgot Password ---------------- */
  forgotPasswordLink?.addEventListener("click", (e) => {
    e.preventDefault();
    // Prefill with current user email if logged in; else from login field
    const curUser = auth.currentUser;
    if (curUser?.email) {
      resetEmailEl.value = curUser.email;
    } else if (loginEmailEl.value.trim()) {
      resetEmailEl.value = loginEmailEl.value.trim();
    }
    forgotModal.style.display = "flex";
  });

  closeModal?.addEventListener("click", () => {
    forgotModal.style.display = "none";
  });

  resetBtn?.addEventListener("click", () => {
    const resetEmail = resetEmailEl.value.trim();
    if (!validateEmail(resetEmail)) return alert("Enter a valid email");

    const curUser = auth.currentUser;

    // If logged in AND same email → smarter handling
    if (curUser && curUser.email && curUser.email.toLowerCase() === resetEmail.toLowerCase()) {
      const providers = currentUserProviders();
      // If no password provider yet, offer to create one instead of reset
      if (!providers.includes('password')) {
        const newPass = prompt("This account uses Google Sign-In and has no password yet. Enter a new password (min 6 chars) to enable email login:");
        if (!newPass) return;
        if (newPass.length < 6) {
          alert("Password must be at least 6 characters.");
          return;
        }
        linkPasswordToCurrentUser(newPass);
        forgotModal.style.display = "none";
        return;
      }
      // Has password provider → send reset
      auth.sendPasswordResetEmail(resetEmail)
        .then(() => {
          alert("Password reset link sent to " + resetEmail);
          forgotModal.style.display = "none";
        })
        .catch(friendlyError);
      return;
    }

    // Not logged in (or different email) → fall back to lookup flow
    auth.fetchSignInMethodsForEmail(resetEmail)
      .then((methods) => {
        if (methods.length === 0) {
          alert("No account with that email. Please Sign Up.");
          throw new Error("no-account");
        }
        if (!methods.includes('password')) {
          alert("This account uses Google Sign-In. Login with Google to set a password.");
          throw new Error("google-only");
        }
        return auth.sendPasswordResetEmail(resetEmail);
      })
      .then(() => {
        alert("Password reset link sent to " + resetEmail);
        forgotModal.style.display = "none";
      })
      .catch((err) => {
        if (err.message === "no-account" || err.message === "google-only") return;
        friendlyError(err);
      });
  });
});
