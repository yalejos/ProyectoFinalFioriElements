sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.ya.legalguardians',
            componentId: 'PatientsSetObjectPage',
            contextPath: '/LegalGuardiansSet/toPatients'
        },
        CustomPageDefinitions
    );
});