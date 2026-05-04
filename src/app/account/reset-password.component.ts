import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

enum TokenStatus {
    Validating,
    Valid,
    Invalid
}

@Component({ templateUrl: 'reset-password.component.html', standalone: false })
export class ResetPasswordComponent implements OnInit {
    TokenStatus = TokenStatus;
    tokenStatus = TokenStatus.Validating;
    token?: string;
    form!: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef  // ✅ ADD THIS
    ) { }

    ngOnInit() {
        console.log('🚀 Reset password component initialized');
        
        this.form = this.formBuilder.group({
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });

        const token = this.route.snapshot.queryParams['token'];
        console.log('📋 Token from URL:', token);

        if (!token) {
            console.error('❌ No token!');
            this.alertService.error('No reset token provided. Please use the link from the forgot password email.');
            this.tokenStatus = TokenStatus.Invalid;
            return;
        }

        console.log('✅ Token found, about to validate...');
        
        this.accountService.validateResetToken(token)
            .pipe(first())
            .subscribe({
                next: () => {
                    console.log('✅ Token validated successfully!');
                    this.token = token;
                    this.tokenStatus = TokenStatus.Valid;
                    this.cdr.detectChanges();  // ✅ FORCE UPDATE VIEW
                    
                    // Remove token from url after view updates
                    this.router.navigate([], { relativeTo: this.route, replaceUrl: true });
                },
                error: (err) => {
                    console.error('❌ Token validation FAILED:', err);
                    this.tokenStatus = TokenStatus.Invalid;
                    this.cdr.detectChanges();  // ✅ FORCE UPDATE VIEW
                }
            });
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        this.accountService.resetPassword(this.token!, this.f.password.value, this.f.confirmPassword.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true });
                    this.router.navigate(['../login'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
}