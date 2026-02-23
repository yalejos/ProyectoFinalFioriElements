import Input from 'sap/m/Input';
import Button from 'sap/m/Button';
import Dialog from 'sap/m/Dialog';
import View from 'sap/ui/core/mvc/View';
import Filter from 'sap/ui/model/Filter';
import Fragment from "sap/ui/core/Fragment";
import MessageToast from "sap/m/MessageToast";
import BaseContext from "sap/ui/model/Context";
import Guid from 'sap/ui/model/odata/type/Guid';
import Context from 'sap/ui/model/odata/v4/Context';
import JSONModel from 'sap/ui/model/json/JSONModel';
import VizFrame from 'sap/viz/ui5/controls/VizFrame';
import StandardListItem from "sap/m/StandardListItem";
import FilterOperator from 'sap/ui/model/FilterOperator';
import ODataModel from 'sap/ui/model/odata/v4/ODataModel';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ODataMetaModel from 'sap/ui/model/odata/v4/ODataMetaModel';
import ExtensionAPI from 'sap/fe/templates/ObjectPage/ExtensionAPI';
import CalendarAppointment from 'sap/ui/unified/CalendarAppointment';
import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension';
import ODataContextBinding from 'sap/ui/model/odata/v4/ODataContextBinding';
import { DateRangePicker$ChangeEvent } from 'sap/ui/webc/main/DateRangePicker';
import SelectDialog, { SelectDialog$ConfirmEvent, SelectDialog$SearchEvent } from "sap/m/SelectDialog";
import SinglePlanningCalendar, { SinglePlanningCalendar$AppointmentDropEvent, SinglePlanningCalendar$AppointmentSelectEvent } from "sap/m/SinglePlanningCalendar";

/**
 * @namespace com.ya.legalguardians.ext.controller
 * @controller
 */

export default class ObjectPage extends ControllerExtension<ExtensionAPI> {
	_pDialog: Dialog;
	private _pValueHelpDialog: Promise<SelectDialog>;
	private _sInputId: string;
	private _oSelectedAppointmentContext: Context | BaseContext | null | undefined = null;

	static overrides = {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.ya.legalguardians.ext.controller.ObjectPage
		 */
		onInit(this: ObjectPage) {
			// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
			const model = this.base.getExtensionAPI().getModel();
			this.formModel();
		},
		routing: {
			onAfterBinding: function (this: ObjectPage, oContext: Context) {
				this._loadChartData(oContext);
			}
		}
	}

	private async _loadChartData(oContext: Context): Promise<void> {

		if (!oContext) return;
		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView();
		const oModel = oContext.getModel() as ODataModel;
		const oMeta = oModel.getMetaModel() as ODataMetaModel;

		// Validar navegación toAppointments

		// Obtener canonical path
		const sPath = await oContext.requestCanonicalPath();

		// Obtener el nombre del EntitySet desde el binding
		const EntitySet = "/" + sPath.split("(")[0].replace("/", "");

		// Obtener el tipo EDM del EntitySet
		const sEntityType = oMeta.getObject(EntitySet + "/$Type");

		if (!sEntityType) {
			console.log("No se pudo resolver el tipo EDM");
			return;
		}

		// Obtener TODAS las propiedades del tipo EDM
		const oProps = oMeta.getObject(`/${sEntityType}`);

		if (!oProps) {
			console.log("No se pudo obtener el tipo EDM");
			return;
		}

		// Verificar si existe la navegación toAppointments
		const bHasToAppointments = !!oProps["toAppointments"];

		if (!bHasToAppointments) {
			return; //No tiene navegación toAppointments 
		}

        //Si hay navegación toAppointment, muestra el gráfico
		const sCanonical = await oContext.requestCanonicalPath();
		const sActivePath = sCanonical.replace("IsActiveEntity=false", "IsActiveEntity=true");
		const oActiveContext = oView.getModel().bindContext(sActivePath).getBoundContext() as Context;

		try {

			const oListBinding = oView.getModel().bindList("toAppointments", oActiveContext, undefined, undefined, {
				$select: "status_code"

			});

			const aContexts = await oListBinding.requestContexts();
			const aAppointments = aContexts.map((oCtx: any) => oCtx.getObject());

			if (aAppointments.length > 0) {
				const counts = { Confirmadas: 0, EnEspera: 0, Pendientes: 0 };

				aAppointments.forEach((appt: any) => {
					switch (appt.status_code) {
						case "Confirmed": counts.Confirmadas++; break;
						case "OnHold": counts.EnEspera++; break;
						case "Pending": counts.Pendientes++; break;
					}
				});

				const aChartData = [
					{ Status: "Confirmadas", count: counts.Confirmadas }, // Verde
					{ Status: "En espera", count: counts.EnEspera },    // Naranja
					{ Status: "Pendientes", count: counts.Pendientes }   // Azul
				].filter(item => item.count > 0);

				oView.setModel(new JSONModel({ chartData: aChartData }), "chartModel");

				this._configureVizColors(aChartData);
			}
		} catch (oError) {
			console.error("Error: La relación toAppointments no existe en la entidad Patients", oError);
		}

	}

	private _configureVizColors(aChartData: any[]): void {
		const oView = (this.base as any).getView() as View;
		const oVizFrame = oView.byId("fe::CustomSubSection::VizFrame--appointmentVizFrame") as VizFrame;
		const oResourceBundle = (this.base as any).getModel("i18n").getResourceBundle() as ResourceBundle;
		const sTitle = oResourceBundle.getText("charttitle") as string;

		if (oVizFrame) {

			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: ["#2b7d2b", "#e78c07", "#5cbae6"],
					window: {
						start: null,
						end: null
					},

					dataPointStyle: {
						"rules": [
							{
								"dataContext": { "Status": "Confirmadas" },
								"properties": { "color": "#2b7d2b" }, // Verde
								 "displayName": "Confirmed"

							},
							{
								"dataContext": { "Status": "En espera" },
								"properties": { "color": "#e78c07" }, // Naranja
								"displayName": "On Hold"
							},
							{
								"dataContext": { "Status": "Pendientes" },
								"properties": { "color": "#5cbae6" }, // Azul
								"displayName": "Pending"
							}
						]

					},
					dataLabel: {
						visible: true,
						showTotal: true
					}
				},
				title: {
					visible: true,
					text: sTitle
				},
				legend: {
					visible: true,
					showRelevantOnly: true, // Muestra solo los estados que tienen datos
					isSemanticLegend: false,
					title: { visible: false }
				},
				legendGroup: {
					layout: { position: "right" }
				}
			});
		}
	}

	private formModel(): void {
		let data = {
			therapist_ID: "",
			typeAppointment_ID: "",
			title: "",
			description: "",
			beginDate: null,
			endDate: null,
			startDate: "",
			endDate2: "",
			block_ID: "",
			beginTime: "",
			endTime: ""
		};

		const model = new JSONModel(data);
		((this.base as any).getView() as View).setModel(model, "formModel");
	}

	public async onOpenForm(): Promise<void> {
		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;

		this._pDialog ??= await Fragment.load({
			id: oView.getId(),
			name: "com.ya.legalguardians.ext.fragment.Form",
			controller: this
		}) as Dialog;

		oView.addDependent(this._pDialog);
		this._pDialog.open();
	};

	public onCloseDialog(): void {
		this._pDialog.close();
	};

	public async onSchedulePress(): Promise<void> {
		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oModel = oView.getModel() as ODataModel;
		const oFormModel = oView.getModel("formModel") as JSONModel;
		const body = oFormModel.getData();
		const oContext = oView.getBindingContext() as Context;
		const sTherapistID = body.therapist_ID as Guid;
		const sAppointmentType = body.typeAppointment_ID as Guid;
		const sBlockID = body.block_ID as Guid;
		const sTitle = body.title as String;
		const sDescription = body.description as string;
		const sBeginDate = body.beginDate as String;
		const oEditFlow = this.base.getExtensionAPI().getEditFlow();

		if (oContext) {
			try {
				await oContext.requestObject("");
				if (oContext) {

					await oEditFlow.invokeAction("LogaliGroup.scheduleAppointment", {
						contexts: [oContext],
						skipParameterDialog: true,
						parameterValues: [
							{ name: "doctor", value: sTherapistID },
							{ name: "typeAppointment", value: sAppointmentType },
							{ name: "title", value: sTitle },
							{ name: "description", value: sDescription },
							{ name: "beginDate", value: sBeginDate },
							{ name: "block", value: sBlockID }
						],

					});

					MessageToast.show("Appointment scheduled!");

					//Refrescar
					const oBindingContext = oView.getBindingContext() as Context;

					if (oBindingContext) {
						try {
							await oBindingContext.requestSideEffects([
								{ $NavigationPropertyPath: 'toAppointments' }
							])
						} catch {
							oModel.refresh();
						}
						await this._loadChartData(oBindingContext);

					} else {
						oModel.refresh();
					}
					// Limpiar y cerrar
					this.formModel();
					this.onCloseDialog();
				}
			} catch (oError) {
				console.error("Error al navegar a toPatients:", oError);
			}
		}
	}

	public async onValueHelpRequest(oEvent: any): Promise<void> {
		const oInput = oEvent.getSource() as Input;
		this._sInputId = oInput.getId();

		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;

		if (!this._pValueHelpDialog) {
			this._pValueHelpDialog = Fragment.load({
				id: oView.getId(),
				name: "com.ya.legalguardians.ext.fragment.ValueHelp",
				controller: this
			}) as Promise<SelectDialog>;
		}

		const oDialog = await this._pValueHelpDialog;
		oView.addDependent(oDialog);

		const oFormModel = oView.getModel("formModel") as JSONModel;

		let sEntityPath = "";
		let sTitle = "";
		let sCurrentID: string = "";


		if (this._sInputId.includes("inputTherapist")) {
			sEntityPath = "/TherapistsSet";
			sTitle = (this.base as any).getModel("i18n").getResourceBundle().getText("selectTherapist");;
			sCurrentID = oFormModel.getProperty("/therapist_ID");

			oDialog.bindAggregation("items", {
				path: sEntityPath,
				parameters: {
					$select: 'typePerson_ID,fullName'
				},
				template: new StandardListItem({
					title: "{fullName}",
					selected: {
						parts: [{ path: 'typePerson_ID', targetType: 'any' }],
						formatter: (sId: string) => {
							return sId === sCurrentID;
						}
					}
				})
			});


		} else if (this._sInputId.includes("inputType")) {
			sEntityPath = "/VH_TypesAppointments";
			sTitle = (this.base as any).getModel("i18n").getResourceBundle().getText("selectTypeAppointment");
			sCurrentID = oFormModel.getProperty("/typeAppointment_ID");

			oDialog.bindAggregation("items", {
				path: sEntityPath,
				parameters: {
					$select: 'ID,type,description'
				},
				template: new StandardListItem({
					title: "{type}",
					description: "{description}",
					selected: {
						parts: [{ path: 'ID', targetType: 'any' }],
						formatter: (sId: string) => {
							return sId === sCurrentID;
						}
					}
				})
			});
		} else if (this._sInputId.includes("inputBlock")) {
			sEntityPath = "/VH_Blocks";
			sTitle = (this.base as any).getModel("i18n").getResourceBundle().getText("selectBlock");
			sCurrentID = oFormModel.getProperty("/block_ID");

			oDialog.bindAggregation("items", {
				path: sEntityPath,
				parameters: {
					$select: 'ID,block,timeText,beginTime,endTime'
				},
				template: new StandardListItem({
					title: "{block}",
					description: "{timeText}",
					selected: {
						parts: [{ path: 'ID', targetType: 'any' }],
						formatter: (sId: string) => {
							return sId === sCurrentID;
						}
					}
				})
			});


		}

		oDialog.setTitle(sTitle);
		oDialog.open("");
	}

	public onValueHelpSearch(oEvent: any): void {
		const sValue = oEvent.getParameter("value");
		const oFilter = new Filter("Name", FilterOperator.Contains, sValue);
		const oBinding = oEvent.getSource().getBinding("items");
		oBinding.filter([oFilter]);
	}

	public onValueHelpConfirm(oEvent: any): void {
		const oSelectedItem = oEvent.getParameter("selectedItem");

		if (!oSelectedItem) return;

		let sSelectedValue: any;
		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oInput = oView.byId(this._sInputId) as Input;
		const oFormModel = oView.getModel("formModel") as JSONModel;
		const oContext = oSelectedItem.getBindingContext();

		if (this._sInputId.includes("inputTherapist")) {
			const sSelectedTherapistID = oContext.getProperty("typePerson_ID");
			oFormModel.setProperty("/therapist_ID", sSelectedTherapistID);
			sSelectedValue = oSelectedItem.getTitle();
		} else if (this._sInputId.includes("inputType")) {
			const sSelectedID = oContext.getProperty("ID");
			oFormModel.setProperty("/typeAppointment_ID", sSelectedID);
			sSelectedValue = oSelectedItem.getTitle();
		} else if (this._sInputId.includes("inputBlock")) {
			const sSelectedID = oContext.getProperty("ID");
			const sBeginTime = oContext.getProperty("beginTime");
			const sEndTime = oContext.getProperty("endTime");

			oFormModel.setProperty("/block_ID", sSelectedID);
			oFormModel.setProperty("/beginTime", sBeginTime);
			oFormModel.setProperty("/endTime", sEndTime);
			sSelectedValue = oSelectedItem.getDescription();

			const sDate = oFormModel.getProperty("/beginDate");
			if (sDate) {
				const sFullStart = `${sDate}T${sBeginTime}Z`;
				const sFullEnd = `${sDate}T${sEndTime}Z`;
				oFormModel.setProperty("/startDate", sFullStart);
				oFormModel.setProperty("/endDate2", sFullEnd);
			}
		}


		if (oInput && typeof oInput.setValue === "function") {
			oInput.setValue(sSelectedValue);
		} else {

			const oInputFromView = oView.byId(this._sInputId) as Input;
			if (oInputFromView && typeof oInputFromView.setValue === "function") {
				oInputFromView.setValue(sSelectedValue);
			} else {
				console.error("No se pudo encontrar el input para asignar el valor");
			}
		}

		oEvent.getSource().getBinding("items").filter([]);
	}
	public onChangeDatePress(Event: DateRangePicker$ChangeEvent): void {
		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oFormModel = oView.getModel("formModel") as JSONModel;
		const sSelectedDate = Event.getParameter("value");

		if (!sSelectedDate) return;

		oFormModel.setProperty("/endDate", sSelectedDate);

		this._updateFullDateTime(oFormModel, sSelectedDate);

	}

	private _updateFullDateTime(oFormModel: JSONModel, sSelectedDate: string) {
		const sBeginTime = oFormModel.getProperty("/beginTime");
		const sEndTime = oFormModel.getProperty("/endTime");

		if (sSelectedDate && sBeginTime && sEndTime) {

			// Formato esperado por OData v4: YYYY-MM-DDTHH:mm:ssZ
			const sFullStart = `${sSelectedDate}T${sBeginTime}Z`;
			const sFullEnd = `${sSelectedDate}T${sEndTime}Z`;

			oFormModel.setProperty("/startDate", sFullStart);
			oFormModel.setProperty("/endDate2", sFullEnd);

		}
	}

	public onAppointmentSelect(oEvent: SinglePlanningCalendar$AppointmentSelectEvent): void {
		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oAppointment = oEvent.getParameter("appointment") as CalendarAppointment;

		if (oAppointment) {
			this._oSelectedAppointmentContext = oAppointment.getBindingContext();
			(oView.byId("fe::CustomSubSection::PlanningCalendar--confirmBtn") as Button).setEnabled(true);
			(oView.byId("fe::CustomSubSection::PlanningCalendar--cancelBtn") as Button).setEnabled(true);
			(oView.byId("fe::CustomSubSection::PlanningCalendar--confimAttBtn") as Button).setEnabled(true);
		} else {

			this._oSelectedAppointmentContext = null;
			(oView.byId("fe::CustomSubSection::PlanningCalendar--confirmBtn") as Button).setEnabled(false);
			(oView.byId("fe::CustomSubSection::PlanningCalendar--cancelBtn") as Button).setEnabled(false);
			(oView.byId("fe::CustomSubSection::PlanningCalendar--confimAttBtn") as Button).setEnabled(false);
		}

	}

	public async onAppointmentDrop(oEvent: SinglePlanningCalendar$AppointmentDropEvent): Promise<void> {

		const oAppointment = oEvent.getParameter("appointment") as CalendarAppointment;
		const oContext = oAppointment?.getBindingContext() as Context;

		const oNewStart = oEvent.getParameter("startDate") as Date;
		const oNewEnd = oEvent.getParameter("endDate") as Date;
		const sStart = oNewStart.toISOString().split('.')[0] + "Z";
		const sEnd = oNewEnd.toISOString().split('.')[0] + "Z";

		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oModel = oView.getModel() as ODataModel;

		const sID = oContext.getProperty("ID");
		const sActionPath = `/AppointmentsSet(ID=${sID},IsActiveEntity=true)`;
		const oAppointmentContext = oModel.bindContext(sActionPath) as ODataContextBinding;
		const oEditFlow = OExtensionAPI.getExtensionAPI().getEditFlow();

		try {
			await oAppointmentContext.requestObject("");
			const oContext = oAppointmentContext.getBoundContext() as Context;
			if (oAppointmentContext) {

				await oEditFlow.invokeAction("LogaliGroup.reschedule", {
					contexts: oContext,
					skipParameterDialog: true,
					parameterValues: [
						{ name: "startDate", value: sStart },
						{ name: "endDate2", value: sEnd }
					],

				});

				//Refrescar Calendario
				const oBindingContext = oView.getBindingContext() as Context;

				if (oBindingContext) {
					try {
						await oBindingContext.requestSideEffects([
							{ $NavigationPropertyPath: 'toAppointments' }
						])
					} catch {
						oModel.refresh();
					}
				} else {
					oModel.refresh();
				}

				this._refreshUI(oView);
				MessageToast.show("Appointment rescheduled");
			}
		} catch (oError) {
			console.error("Error al navegar a toAppointment:", oError);
		}

	}

	public async onConfirmAppointment(): Promise<void> {
		await this._callAppointmentAction("confirmAppointment");
	}

	public async onCancelAppointment(): Promise<void> {
		await this._callAppointmentAction("cancelAppointment");
	}

	public async onConfirmAttendance(): Promise<void> {
		await this._callAppointmentAction("confirmAttendance");
	}
	private async _callAppointmentAction(sActionName: string): Promise<void> {
		if (!this._oSelectedAppointmentContext) return;

		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oModel = oView.getModel() as ODataModel
		const oContext = this._oSelectedAppointmentContext;
		const oEditFlow = OExtensionAPI.getExtensionAPI().getEditFlow();
		const sID = oContext.getProperty("ID");
		const sActionPath = `/AppointmentsSet(ID=${sID},IsActiveEntity=true)`;
		const oAppointmentContext = oModel.bindContext(sActionPath) as ODataContextBinding;

		try {
			await oAppointmentContext.requestObject("");
			const oActionContext = oAppointmentContext.getBoundContext() as Context;
			if (oActionContext) {
				await oEditFlow.invokeAction(`LogaliGroup.${sActionName}`, {
					contexts: oActionContext,
					skipParameterDialog: true,
					parameterValues: [],
				});

				this._oSelectedAppointmentContext = null;

				//Refrescar Calendario
				const oBindingContext = oView.getBindingContext() as Context;

				if (oBindingContext) {
					try {
						await oBindingContext.requestSideEffects([
							{ $NavigationPropertyPath: 'toAppointments' }
						])
					} catch {
						oModel.refresh();
					}
					await this._loadChartData(oBindingContext);
				} else {
					oModel.refresh();
				}

				let sMessage = "";

				switch (sActionName) {
					case "confirmAppointment":
						sMessage = "Appointment confirmed";
						break;

					case "cancelAppointment":
						sMessage = "Appointment canceled";
						break;

					case "confirmAttendance":
						sMessage = "Attendance confirmed";
						break;
				}

				MessageToast.show(sMessage);

				this._refreshUI(oView);
			}
		} catch (oError) {
			console.error("Action error:", oError);
		}

	}

	private _refreshUI(oView: View): void {
		(oView.byId("fe::CustomSubSection::PlanningCalendar--confirmBtn") as Button).setEnabled(false);
		(oView.byId("fe::CustomSubSection::PlanningCalendar--cancelBtn") as Button).setEnabled(false);
		(oView.byId("fe::CustomSubSection::PlanningCalendar--confimAttBtn") as Button).setEnabled(false);
	}

}
