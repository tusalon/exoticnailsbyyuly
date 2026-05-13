// client-app.js - Aplicación de clientes con flujo completo y PWA
// MEJORA: Redirección automática según rol al iniciar

console.log('🚀 CLIENT-APP.JS VERSIÓN:', '2024-03-01');

window.addEventListener('error', function(e) {
    console.error('❌ Error detectado, posible versión antigua:', e.message);
    
    if (e.message.includes('Failed to load') || e.message.includes('Unexpected token')) {
        console.log('🔄 Forzando recarga por posible versión antigua...');
        
        if (window.swRegistration) {
            window.swRegistration.unregister().then(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }
});

function ClientApp() {
    const [step, setStep] = React.useState('auth');
    const [cliente, setCliente] = React.useState(null);
    const [selectedService, setSelectedService] = React.useState(null);
    const [selectedProfesional, setSelectedProfesional] = React.useState(null);
    const [selectedDate, setSelectedDate] = React.useState('');
    const [selectedTime, setSelectedTime] = React.useState('');
    const [bookingConfirmed, setBookingConfirmed] = React.useState(null);
    const [userRol, setUserRol] = React.useState('cliente');
    const [history, setHistory] = React.useState(['auth']);
    const [horariosPorDia, setHorariosPorDia] = React.useState({});

    // ============================================
    // DETECTAR SESIÓN AL INICIAR Y REDIRIGIR SEGÚN ROL
    // ============================================
    React.useEffect(() => {
        const adminAuth = localStorage.getItem('adminAuth') === 'true';
        const profesionalAuth = localStorage.getItem('profesionalAuth');
        const clienteAuth = localStorage.getItem('clienteAuth');
        
        if (adminAuth) {
            console.log('👑 Usuario admin detectado, redirigiendo a admin.html');
            window.location.href = 'admin.html';
            return;
        }
        
        if (profesionalAuth) {
            console.log('👤 Usuario profesional detectado, redirigiendo a admin.html');
            window.location.href = 'admin.html';
            return;
        }
        
        if (clienteAuth) {
            try {
                const clienteData = JSON.parse(clienteAuth);
                setCliente(clienteData);
                setUserRol('cliente');
                setStep('welcome');
                setHistory(['auth', 'welcome']);
            } catch (e) {
                console.error('Error al parsear clienteAuth', e);
                localStorage.removeItem('clienteAuth');
            }
        }
    }, []);

    // ============================================
    // MANEJO DEL BOTÓN FÍSICO "ATRÁS"
    // ============================================
    React.useEffect(() => {
        const handlePopState = (event) => {
            event.preventDefault();
            goBack();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [history]);

    // ============================================
    // FUNCIONES DE NAVEGACIÓN
    // ============================================
    const navigateTo = (newStep) => {
        setHistory(prev => [...prev, newStep]);
        setStep(newStep);
    };

    const goBack = () => {
        if (history.length <= 1) {
            if (confirm('¿Salir de la aplicación?')) {
                window.close();
            }
            return;
        }

        const newHistory = [...history];
        newHistory.pop();
        const previousStep = newHistory[newHistory.length - 1];
        setHistory(newHistory);
        setStep(previousStep);
    };

    // ============================================
    // FUNCIONES DE SCROLL AUTOMÁTICO
    // ============================================
    React.useEffect(() => {
        if (selectedService) {
            setTimeout(() => {
                document.getElementById('profesional-section')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    }, [selectedService]);

    React.useEffect(() => {
        if (selectedProfesional) {
            setTimeout(() => {
                document.getElementById('calendar-section')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    }, [selectedProfesional]);

    React.useEffect(() => {
        if (selectedDate) {
            setTimeout(() => {
                document.getElementById('time-section')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    }, [selectedDate]);

    // ============================================
    // MANEJO DE ACCESO
    // ============================================
    const handleAccessGranted = (nombre, whatsapp) => {
        const clienteData = { nombre, whatsapp };
        setCliente(clienteData);
        setUserRol('cliente');
        localStorage.setItem('clienteAuth', JSON.stringify(clienteData));
        navigateTo('welcome');
    };

    const handleStartBooking = () => {
        navigateTo('service');
    };

    const handleServiceSelect = (service) => {
        setSelectedService(service);
        setSelectedProfesional(null);
        setSelectedDate('');
        setSelectedTime('');
        setHorariosPorDia({});
        setTimeout(() => {
            document.getElementById('profesional-section')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 150);
    };

    const handleLogout = () => {
        localStorage.removeItem('clienteAuth');
        setCliente(null);
        setSelectedService(null);
        setSelectedProfesional(null);
        setSelectedDate('');
        setSelectedTime('');
        setUserRol('cliente');
        setHistory(['auth']);
        setStep('auth');
        window.location.href = 'index.html';
    };

    const resetBooking = () => {
        setSelectedService(null);
        setSelectedProfesional(null);
        setSelectedDate('');
        setSelectedTime('');
        setStep('service');
        setBookingConfirmed(null);
    };

    const goToMyBookings = () => {
        navigateTo('mybookings');
    };

    const handleVolverDeMyBookings = () => {
        goBack();
    };

    // ============================================
    // RENDERIZADO DE PANTALLAS
    // ============================================
    const renderStep = () => {
        switch(step) {
            case 'auth':
                return (
                    <ClientAuthScreen 
                        onAccessGranted={handleAccessGranted}
                        onGoBack={history.length > 1 ? goBack : null}
                    />
                );
            
            case 'welcome':
                return (
                    <WelcomeScreen 
                        onStart={handleStartBooking}
                        onGoBack={goBack}
                        cliente={cliente}
                        userRol={userRol}
                    />
                );
            
            case 'mybookings':
                return (
                    <MyBookings 
                        cliente={cliente} 
                        onVolver={handleVolverDeMyBookings}
                    />
                );
            
            case 'service':
                return (
                    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100">
                        <Header 
                            cliente={cliente} 
                            onLogout={handleLogout}
                            onMisReservas={goToMyBookings}
                            onGoBack={goBack}
                            userRol={userRol}
                            showBackButton={true}
                        />
                        
                        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
                            {/* SECCIÓN 1: SERVICIOS */}
                            <ServiceSelection 
                                onSelect={handleServiceSelect} 
                                selectedService={selectedService}
                            />
                            
                            {/* SECCIÓN 2: PROFESIONALES - CON selectedService */}
                            {selectedService && (
                                <div id="profesional-section">
                                    {selectedService.esMultiple ? (
                                        <MultiProfesionalSelector
                                            onSelect={setSelectedProfesional}
                                            selectedProfesional={selectedProfesional}
                                            selectedService={selectedService}
                                        />
                                    ) : (
                                        <ProfesionalSelector
                                            onSelect={setSelectedProfesional}
                                            selectedProfesional={selectedProfesional}
                                            selectedService={selectedService}
                                        />
                                    )}
                                </div>
                            )}
                            
                            {/* SECCIÓN 3: CALENDARIO */}
                            {selectedProfesional && (
                                <div id="calendar-section">
                                    <Calendar 
                                        onDateSelect={setSelectedDate} 
                                        selectedDate={selectedDate}
                                        profesional={selectedProfesional?.esMultiple ? selectedProfesional.asignaciones[0]?.profesional : selectedProfesional}
                                        service={selectedService}
                                        onHorariosCargados={setHorariosPorDia}
                                    />
                                </div>
                            )}
                            
                            {/* SECCIÓN 4: HORARIOS */}
                            {selectedDate && (
                                <div id="time-section">
                                    {selectedService.esMultiple ? (
                                        <MultiTimeSlots
                                            service={selectedService}
                                            date={selectedDate}
                                            profesional={selectedProfesional}
                                            onTimeSelect={setSelectedTime}
                                            selectedTime={selectedTime}
                                        />
                                    ) : (
                                        <TimeSlots
                                            service={selectedService}
                                            date={selectedDate}
                                            profesional={selectedProfesional}
                                            onTimeSelect={setSelectedTime}
                                            selectedTime={selectedTime}
                                            horariosPorDia={horariosPorDia}
                                        />
                                    )}
                                </div>
                            )}
                            
                            {/* SECCIÓN 5: CONFIRMACIÓN */}
                            {selectedTime && (
                                <BookingForm
                                    service={selectedService}
                                    profesional={selectedProfesional}
                                    date={selectedDate}
                                    time={selectedTime}
                                    cliente={cliente}
                                    onSubmit={(booking) => {
                                        setBookingConfirmed(booking);
                                        navigateTo('confirmation');
                                    }}
                                    onCancel={() => setSelectedTime('')}
                                />
                            )}
                            
                            {/* WhatsApp Button */}
                            <WhatsAppButton />
                        </div>
                    </div>
                );
            
            case 'confirmation':
                return (
                    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100">
                        <Header 
                            cliente={cliente} 
                            onLogout={handleLogout}
                            onGoBack={goBack}
                            userRol={userRol}
                            showBackButton={true}
                        />
                        <Confirmation 
                            booking={bookingConfirmed} 
                            onReset={resetBooking}
                        />
                    </div>
                );
            
            default:
                return null;
        }
    };

    return renderStep();
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ClientApp />);
