import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension';
import ExtensionAPI from 'sap/fe/templates/ObjectPage/ExtensionAPI';
import JSONModel from 'sap/ui/model/json/JSONModel';
import MessageToast from "sap/m/MessageToast";
import Fragment from "sap/ui/core/Fragment";
import View from 'sap/ui/core/mvc/View';
import Dialog from 'sap/m/Dialog';
import SelectDialog, { SelectDialog$ConfirmEvent, SelectDialog$SearchEvent } from "sap/m/SelectDialog";
import Input from 'sap/m/Input';
import StandardListItem from "sap/m/StandardListItem";
import Filter from 'sap/ui/model/Filter';
import FilterOperator from 'sap/ui/model/FilterOperator';
import { DateRangePicker$ChangeEvent } from 'sap/ui/webc/main/DateRangePicker';
import SinglePlanningCalendar, { SinglePlanningCalendar$AppointmentDropEvent, SinglePlanningCalendar$AppointmentSelectEvent } from "sap/m/SinglePlanningCalendar";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Guid from 'sap/ui/model/odata/type/Guid';
import ODataMetaModel from 'sap/ui/model/odata/v4/ODataMetaModel';
import DragInfo from "sap/ui/core/dnd/DragInfo";
import DropInfo from "sap/ui/core/dnd/DropInfo";
import Context from 'sap/ui/model/odata/v4/Context';
import CalendarAppointment from 'sap/ui/unified/CalendarAppointment';
import DateFormat from 'sap/ui/core/format/DateFormat';
import DateTime from 'sap/ui/model/odata/type/DateTime';

/**
 * @namespace com.ya.legalguardians.ext.controller
 * @controller
 */
export default class ObjectPage extends ControllerExtension<ExtensionAPI> {
	_pDialog: Dialog;
	private _pValueHelpDialog: Promise<SelectDialog>;
	private _sInputId: string;
	private _oSelectedAppointmentContext: any = null;

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
		//@ts-ignore
		(this.base.getView() as View).setModel(model, "formModel");
	}

	public async onOpenForm(): Promise<void> {
		//@ts-ignore
		const oView = (this.base.getView() as View);

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
		const oFormModel = oView.getModel("formModel") as JSONModel;
		const body = oFormModel.getData();
		const oContext = oView.getBindingContext() as any;
		const sTherapistID = body.therapist_ID as Guid;
		const sAppointmentType = body.typeAppointment_ID as Guid;
		const sBlockID = body.block_ID as Guid;
		const sTitle = body.title as String;
		const sDescription = body.description as string;
		const sBeginDate = body.beginDate as String;
		const oEditFlow = this.base.getExtensionAPI().getEditFlow();
		console.log(sTherapistID);
		console.log(body);

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

					// Limpiar y cerrar
					this.formModel();
					this.onCloseDialog();
				}
			} catch (oError: any) {
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
			//@ts-ignore
			sTitle = this.base.getModel("i18n").getResourceBundle().getText("selectTherapist");;
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
			//@ts-ignore
			sTitle = this.base.getModel("i18n").getResourceBundle().getText("selectTypeAppointment");
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
			//@ts-ignore
			sTitle = this.base.getModel("i18n").getResourceBundle().getText("selectBlock");
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
		// Filtramos por el campo "Name" de la entidad
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
		const oAppointment = oEvent.getParameter("appointment");

		if (oAppointment) {
			this._oSelectedAppointmentContext = oAppointment.getBindingContext();
			(oView.byId("fe::CustomSubSection::PlanningCalendar--confirmBtn") as any).setEnabled(true);
			(oView.byId("fe::CustomSubSection::PlanningCalendar--cancelBtn") as any).setEnabled(true);
		} else {

			this._oSelectedAppointmentContext = null;
			(oView.byId("fe::CustomSubSection::PlanningCalendar--confirmBtn") as any).setEnabled(false);
			(oView.byId("fe::CustomSubSection::PlanningCalendar--cancelBtn") as any).setEnabled(false);
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
		const oModel = oView.getModel() as ODataMetaModel;

		const sID = oContext.getProperty("ID");
		const sActionPath = `/AppointmentsSet(ID=${sID},IsActiveEntity=true)`;
		const oAppointmentContext = oModel.bindContext(sActionPath) as any;
		const oEditFlow = this.base.getExtensionAPI().getEditFlow();

		try {
			await oAppointmentContext.requestObject("");
			if (oAppointmentContext) {

				await oEditFlow.invokeAction("LogaliGroup.reschedule", {
					contexts: oAppointmentContext,
					skipParameterDialog: true,
					parameterValues: [
						{ name: "startDate", value: sStart },
						{ name: "endDate2", value: sEnd }
					],

				});

				//Refrescar Calendario
				const oBindingContext = oView.getBindingContext() as any;

				if (oBindingContext && oBindingContext.getBinding()) {
					oBindingContext.getBinding().refresh();
				} else {
					oModel.refresh();
				}
				MessageToast.show("Appointment rescheduled");
			}
		} catch (oError: any) {
			console.error("Error al navegar a toAppointment:", oError);
		}

	}

	public async onConfirmAppointment(): Promise<void> {
		await this._callAppointmentAction("confirmAppointment");
	}

	public async onCancelAppointment(): Promise<void> {
		await this._callAppointmentAction("cancelAppointment");
	}
	private async _callAppointmentAction(sActionName: string): Promise<void> {
		if (!this._oSelectedAppointmentContext) return;

		const OExtensionAPI = this.base as any;
		const oView = OExtensionAPI.getView() as View;
		const oModel = oView.getModel() as ODataMetaModel;
		const oContext = this._oSelectedAppointmentContext;

		const sID = oContext.getProperty("ID");
		const sActionPath = `/AppointmentsSet(ID=${sID},IsActiveEntity=true)`;
		const oAppointmentContext = oModel.bindContext(sActionPath) as any;
		const oEditFlow = this.base.getExtensionAPI().getEditFlow();

		try {
			await oAppointmentContext.requestObject("");
			if (oAppointmentContext) {

				await oEditFlow.invokeAction(`LogaliGroup.${sActionName}`, {
				//await oEditFlow.invokeAction("LogaliGroup.cancelAppointment", {
					contexts: oAppointmentContext,
					skipParameterDialog: true,
					parameterValues: []
				});

				// Resetear selección y botones
				(oView.byId("fe::CustomSubSection::PlanningCalendar--confirmBtn") as any).setEnabled(false);
				(oView.byId("fe::CustomSubSection::PlanningCalendar--cancelBtn") as any).setEnabled(false);

				//Refrescar Calendario
				const oBindingContext = oView.getBindingContext() as any;

				if (oBindingContext && oBindingContext.getBinding()) {
					oBindingContext.getBinding().refresh();
				} else {
					oModel.refresh();
				}

				if (sActionName === "confirmAppointment") {
					MessageToast.show("Appointment confirmed");
				} else {
					MessageToast.show("Appointment canceled");
				}

			}
		} catch (oError: any) {
			console.error("Action error:", oError);
		}

	}

}
