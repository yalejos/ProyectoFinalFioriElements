# ProyectoFinalFioriElements
SAP BTP - SAPUI5 / Flexible Programming model / Fiori Elements Project
Este repositorio contiene el código fuente de la aplicación Legal Guardians, desarrollada sobre SAP Business Technology Platform (BTP). 
El proyecto implementa una arquitectura de extensiones, integrando servicios OData V4 con manejo de Draft (IsActiveEntity) y lógica de navegación 
hacia pacientes y citas.

# Instalación y Configuración
Siga estos pasos para ejecutar el proyecto en su entorno local o en Business Application Studio:
1. Clonar el repositorio
  Get Started with SAP Business Application Studio -> Clone from Git provide repositoy URL: https://github.com/yalejos/ProyectoFinalFioriElements.git
  
3. Instalar dependencias
   Open New terminal-> Execute:
   npm install
5. Configuración del Destino (BTP)
6. Asegúrese de tener configurado el destino hacia el backend en su subaccount de BTP o en el archivo ui5-deploy.yaml / xs-app.json.
   La aplicación consume el servicio:
    Service Path: /odata/v4/logali-group/
    Entity Set: LegalGuardiansSet

# 🚀 Vista Previa
![Planning Calendar](legal_guardians/img/Planning%20Calendar.png)

# Contacto: 
  Yenifer Alejos Ingeniero en Informática | Arquitecto Líder SAP. LinkedIn: http://www.linkedin.com/in/yenifer-alejos-81498337
   
