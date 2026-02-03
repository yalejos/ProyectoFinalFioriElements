sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/ya/legalguardians/test/integration/pages/LegalGuardiansSetList",
	"com/ya/legalguardians/test/integration/pages/LegalGuardiansSetObjectPage",
	"com/ya/legalguardians/test/integration/pages/PatientsSetObjectPage"
], function (JourneyRunner, LegalGuardiansSetList, LegalGuardiansSetObjectPage, PatientsSetObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/ya/legalguardians') + '/test/flp.html#app-preview',
        pages: {
			onTheLegalGuardiansSetList: LegalGuardiansSetList,
			onTheLegalGuardiansSetObjectPage: LegalGuardiansSetObjectPage,
			onThePatientsSetObjectPage: PatientsSetObjectPage
        },
        async: true
    });

    return runner;
});

