!INC Local Scripts.EAConstants-JScript
!INC EAScriptLib.JavaScript-CSV
!INC EAScriptLib.JavaScript-Dialog
!INC EAScriptLib.JavaScript-TaggedValue 

/*
 * This code has been included from the default Diagram Script template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.
 *
 * Script Name: Diagram_Review_Script_V2 (development)
 * Author: Mukkamala Kiran (review checks provided by Matthias Farian)
 * Purpose: To Check basic intergity and pre review checks for authors and reviewers of EA models
 * Version: 2.0.1
 * Date: 29-01-2024
 * Log: Mechanism to apply user lock to review finding package has been added. 
 * Version: 2.0.0
 * Date: 25-01-2024
 * Log: Mechanism to log the review findings to a seperate package along with review summary has been added. 
 * Version: 1.0.4
 * Date: 19-09-2023
 * Log: Additional check for classifier types added for all, optional parameters will be considered now and won't flag as void parameters 
 * Version: 1.0.3
 * Date: 15-09-2023
 * Log: Additional check(classifiers) added in case of Action Pin synchronised with activity parameters of call behavior action
 * Date: 08-05-2023
 * Log: Type Check on both ends of a connector for Activity diagram
 * Version: 1.0.1
 * Date: 30-03-2023
 * Log: Port direction check corrected for out
 * Version: 1.0.0
 * Date: 24-03-2023
 * Log: Preliminary checks for Activity, BDD and IBD were implemented. 
 */
 
var CurrentReviewDiagramPkg as EA.Package;

//GUID of the package containing Review Package findings to be created
const Review_Package_Location_GUID = "{A78495CA-6DA3-4528-A030-440424E927C4}";
//const Review_Package_Location_GUID = "{2B67DD9C-24F4-4213-B0EB-BC324A128D23}";

//GUID of the package containing Review Summary Package Diagram
const Diagram_Summary_GUID = "{A46C93DA-D20A-4325-ABC7-CBC4D465B416}";

// Log Review Finding
function Log_Review_Finding(selectedElement, findingtext)
{
	Session.Output(findingtext);
	Add_Finding_To_Review_Package(selectedElement, findingtext);

}
 
function Find_My_ParentID( myElement)
{
	
	var myconnector as EA.Connector;
	 
	if (myElement.Connectors.Count > 0)
		{
			for( var i = 0; i < myElement.Connectors.Count; i++)
				{
					myconnector = myElement.Connectors.GetAt(i);
					if ((myconnector.ClientID == myElement.ElementID) && (myconnector.MetaType == "Aggregation"))
						{
							return myconnector.SupplierID;
						}
				}
		}
		
	return 0;			
}


function Find_My_ParentClassifier( myElement)
{
	
	var myconnector as EA.Connector;
	var myclassifier as EA.Element;
	
	if (myElement.Type == "ActionPin") 
	{
		if ((myElement.ClassifierType = "ActivtityParameter") && (myElement.ClassfierID != 0))
		{
			myclassifier = Repository.GetElementByID(myElement.ClassifierID);
			if (myclassifier.ClassifierType == "DataType")
			{
				return myclassifier;
			}
			else
				return 0;
		}
		else
		{
			myclassifier = Repository.GetElementByID(myElement.ClassifierID);
			return myclassifier;
		}
	}
	else if (myElement.Type == "ActivtityParameter")
	{
		myclassifier = Repository.GetElementByID(myElement.ClassifierID);
		return myclassifier;
	}
	else if (myElement.Type == "Synchronization")
	{
		if (myElement.Connectors.Count > 0)
		{
			for( var i = 0; i < myElement.Connectors.Count; i++)
				{
					myconnector = myElement.Connectors.GetAt(i);
					if (myconnector.ClientID != myElement.ElementID)
						{
							 return Find_My_ParentClassifier(Repository.GetElementByID(myconnector.ClientID));
						}
				}
		}
	}
	else
		return 0;
				
}

function Find_My_IBChild( myIBElement)
{
	
	var myconnector as EA.Connector;
	 
	if (myIBElement.Connectors.Count > 0)
		{
			for( var i = 0; i < myIBElement.Connectors.Count; i++)
				{
					myconnector = myIBElement.Connectors.GetAt(i);
					if ((myconnector.ClientID == myIBElement.ElementID) && (myconnector.MetaType == "Generalization"))
						{
							return myconnector.SupplierID;
						}
				}
		}
		
	return 0;			
}

function Check_BadType_Proxy_Present(badTypeProxyPortsMap, ElementID1, ElementID2)
{
	if (badTypeProxyPortsMap.has(ElementID1))
	{
		if (badTypeProxyPortsMap.get(ElementID1) == ElementID2)
			return true;
	}
	else if (badTypeProxyPortsMap.has(ElementID2))
	{
		if (badTypeProxyPortsMap.get(ElementID2) == ElementID1)
			return true;
	}
	else
		return false;
} 
 
function Check_Presence_In_Diagram (Ele, DiagramElementsMap, findings, Ignore_List, Optional_Parameters_Check = false)
{
	var myChildElement as EA.Element;
	var myconnector as EA.Connector;
	var myParentElement as EA.Element;
	var myGrandParentElement as EA.Element;
	var myParentElementID = 0;
	var myGrandParentElementID = 0;
	var ActProperties as EA.TypeInfoProperties;
	var ActTypeProperty as EA.TypeInfoProperty;
	var myClassifier as EA.Element;
	
	//Check for Grand Parent, if exists in the same diagram then igonre reporting the missing child items
	myParentElementID = Find_My_ParentID(Ele);
	
	if ( myParentElementID != 0)
		{
			myParentElement = Repository.GetElementByID(myParentElementID);
		
			if (DiagramElementsMap.has(myParentElementID) ||  (Ignore_List.has(myParentElement.Type)))
				{
					myGrandParentElementID = Find_My_ParentID(myParentElement);
				
					if (myGrandParentElementID  != 0)
						{
							myGrandParentElement = Repository.GetElementByID(myGrandParentElementID);
						
							if (DiagramElementsMap.has(myGrandParentElementID) ||  (Ignore_List.has(myParentElement.Type)))
								{
									return findings;
								}
					
						}
				}
			
		}
	
	//To find missing elements in diagram
	if (Ele.Elements.Count > 0)
	{
		for(var c = 0; c < Ele.Elements.Count; c++)
			{
				myChildElement = Ele.Elements.GetAt(c);
				
				if (!(DiagramElementsMap.has(myChildElement.ElementID) || (Ignore_List.has(myChildElement.Type))))
					{
						if (Optional_Parameters_Check)
						{
							// Check added to consider optional activity parameter
							if ((myChildElement.ClassifierType = "ActivtityParameter") && (myChildElement.ClassfierID != 0))
								{
									myClassifier = Repository.GetElementByID(myChildElement.ClassfierID);
									if (myClassifier.Stereotype != "optional")
									{
										findings++;
										Log_Review_Finding(myChildElement, findings+ ". CHK_Void ==> " + myChildElement.Type + " : "+ myChildElement.Name + ": " + myChildElement.ClassifierName + " with GUID: " + myChildElement.ElementGUID + " associated to " + Ele.Stereotype + " :" + Ele.Name + ": " + Ele.ClassifierName + " missing in current Diagram");
									}
								}
						}
						else
						{	
							findings++;
							Log_Review_Finding(myChildElement, findings+ ". CHK_Void ==> " + myChildElement.Type + " : "+ myChildElement.Name + ": " + myChildElement.ClassifierName + " with GUID: " + myChildElement.ElementGUID + " associated to " + Ele.Stereotype + " :" + Ele.Name + ": " + Ele.ClassifierName + " missing in current Diagram");
							
						}
							
					}
			
			}
		
	}
	
	return findings;
}

//Show warning dialog box
function Show_Warning()
{
	var response;
	var vbe = new COMObject("ScriptControl");
	vbe.Language = "VBScript";
	
	response = vbe.Eval( "MsgBox(\"" + "Review Package is locked, kindly unlock to proceed. Click OK to try again!!!" + "\",vbOKCancel+vbQuestion,\"" + "Wrong Data, Try Again !!!" + "\")");
		
	if (response == 1)
	{
		return 1;
	}
	else
	{
		return 0;
	}

}

//Creating Review Diagram Package for finding results
function Create_Review_Package(Diagram)
{
	var ReviewPackageName = "ReviewPackage for " + Diagram.Name;
	var DiagramPath as EA.Package;
	DiagramPath = Repository.GetPackageByID(Diagram.PackageID);
	var FullPath = Diagram.Name;
	while (DiagramPath.ParentID != 0)
	{
		FullPath = DiagramPath.Name + "." + FullPath;
		DiagramPath = Repository.GetPackageByID(DiagramPath.ParentID);

	}
	
	var ReviewPackage as EA.Package;
	ReviewPackage = Repository.GetPackageByGuid(Review_Package_Location_GUID);
	var childPackages as EA.Collection;
	childPackages = ReviewPackage.Packages;
				
	var ReviewDiagramPackage as EA.Package;
	ReviewDiagramPackage = childPackages.AddNew(ReviewPackageName, "Package");
	childPackages.Refresh();
	
	if (!ReviewDiagramPackage)
	{
		//Show dialog box if not able to create a review package
		//Show_Warning();
		
		//Apply User lock to proceed further
		ReviewPackage.ApplyUserLockRecursive(true, false, false);
		ReviewDiagramPackage = childPackages.AddNew(ReviewPackageName, "Package");
		childPackages.Refresh();
		if (!ReviewDiagramPackage.Update())
		{
			Session.Output("Review Package is locked, kindly unlock to proceed.");
		}
	} 
	
	ReviewDiagramPackage.Alias = "DiagramUnderReview at: " + FullPath;
	ReviewDiagramPackage.Version = "1.0";
	ReviewDiagramPackage.Status = "Proposed";
	ReviewDiagramPackage.Update();
	
	ReviewDiagramPackage = Repository.GetPackageByGuid(ReviewDiagramPackage.PackageGUID);
	
	var taggedValue = ReviewDiagramPackage.Element.TaggedValues.AddNew("RelatedGUID", Diagram.DiagramGUID);
	taggedValue.Update();
	
	return ReviewDiagramPackage;
	
}

//Remove Review Package
function Remove_Review_Diagram_Package(Diagram)
{
	//clean up the folder created in case of no findings
	var ReviewPackage = Repository.GetPackageByGuid(Review_Package_Location_GUID);
	var childPackages  as EA.Collection;
	var Pkg_removed = false;
	childPackages = ReviewPackage.Packages;
	
	for (var i = 0; i < childPackages.Count; i++) 
	{
		var SubPkg as EA.Package;
		SubPkg = childPackages.GetAt(i);

		if (SubPkg.PackageGUID == CurrentReviewDiagramPkg.PackageGUID) {
			childPackages.Delete(i);
			childPackages.Refresh();
			ReviewPackage.Update();
			Pkg_removed= true;
			break;
		}

	}
	if(!Pkg_removed)
	{
		Session.Output("No child package created for this review script.");
	}
	
}

//Add Summary(Diagram) for findings
function Add_Summary_To_Review_Package(Diagram)
{
	var Template_Summary_Diagram as EA.Diagram;
	var Current_Summary_Diagram as EA.Diagram;
	Template_Summary_Diagram = Repository.GetDiagramByGuid(Diagram_Summary_GUID);
	
	Current_Summary_Diagram = CurrentReviewDiagramPkg.Diagrams.AddNew("Review Summary for " + Diagram.Name, Template_Summary_Diagram.Type);
	CurrentReviewDiagramPkg.Diagrams.Refresh();
	
	//Current_Summary_Diagram.MetaType = Template_Summary_Diagram.MetaType;
	Current_Summary_Diagram.Version = Template_Summary_Diagram.Version;
	Current_Summary_Diagram.Update();
	
	for(var i = 0; i < Template_Summary_Diagram.DiagramObjects.Count; i++)
	{      
		var sourceElement as EA.DiagramObject;
		var diagramObject as EA.DiagramObject;
		sourceElement = Template_Summary_Diagram.DiagramObjects.GetAt(i);
		
		var left, right, top, bottom;
		left = sourceElement.left;
		right = sourceElement.right;
		top = sourceElement.top;
		bottom = sourceElement.bottom;
		
		var position = "l="+left+";r="+right+";t="+top+";b="+bottom+";"
		
		diagramObject = Current_Summary_Diagram.DiagramObjects.AddNew(position, "" );
		Current_Summary_Diagram.DiagramObjects.Refresh();
		
		diagramObject.ElementID = sourceElement.ElementID;
		diagramObject.Sequence = sourceElement.Sequence;
		diagramObject.Update();
			
	}
	
	Current_Summary_Diagram.Update();
	
	var DiagramPath as EA.Package;
	DiagramPath = Repository.GetPackageByID(Current_Summary_Diagram.PackageID);
	var FullPath = Current_Summary_Diagram.Name;
	while (DiagramPath.ParentID != 0)
	{
		FullPath = DiagramPath.Name + "." + FullPath;
		DiagramPath = Repository.GetPackageByID(DiagramPath.ParentID);
		
	}
	
	Session.Output("Review Summary can be found at " + FullPath);
}

//Add Element(Block) for finding received
function Add_Finding_To_Review_Package(Element, FindingText)
{
	var finding as EA.Element;
	var currentTimeDate = new Date();
	//Unique ID to sort out the findings
	//var FindingID = Math.random().toString(36).substr(2, 9);
	//To get Date without spaces
	symbolless = (date) => new Date(date.getTime() + date.getTimezoneOffset() * -60000)
                               .toISOString()
                               .replace(/[\-\.\:ZT]/g,"")
                               .substr(0,16)
	
	var BlockName = "Finding_" + symbolless (currentTimeDate);
	finding = CurrentReviewDiagramPkg.Elements.AddNew(BlockName, "SysML1.4::Block");
	
	finding.Stereotype = "Review Finding"; //Stereotype for future reports
		
	finding.Alias = "Finding for element at: " + Element.FQName;
	finding.Version = "1.0";
	finding.Status = "Created";
	finding.Notes = FindingText;
	finding.Update();	
	
	TVSetElementTaggedValue(finding, "RelatedGUID", Element.ElementGUID, true);
	
}


/*
 * Diagram Script main function
 */
function OnDiagramScript()
{
	Session.Output("<======== Executing Diagram_Review_Script_V2 ========>");
	
	// Get a reference to the current diagram
	var currentDiagram as EA.Diagram;
	currentDiagram = Repository.GetCurrentDiagram();

	var findings = 0;

	if ( currentDiagram != null )
	{
		// Get a reference to any selected connector/objects
		var myconnector as EA.Connector;
		var selectedObjects as EA.Collection;
		var myCollection as EA.Collection;
		selectedObjects = currentDiagram.DiagramObjects;
        var selectedObject as EA.DiagramObject;
		var selectedElement as EA.Element;
		var OneSideElement as EA.Element;
		var OtherSideElement as EA.Element;
		var tempElement as EA.Element;
		var myProperty as EA.PropertiesTab;
		var myParentElement as EA.Element;
		var myChildElement as EA.Element;
		var InterfaceBlocks = new Map();
		var ProxyPorts = new Map();
		var DiagramElementsMap = new Map();
		var MismatchPairMap = new Map();
		var myclassifier as EA.Element;
		var connectortypeMap = new Map();
		var connectorlistMap =  new Map();
		
		
		// csv Initialize
		//CSV_Initialize();

		//Create review package
		CurrentReviewDiagramPkg = Create_Review_Package(currentDiagram);
				
		var IgnoreListMap = new Map();
		
		if (currentDiagram.Type == "Activity")
		{
			Session.Output("<======== Review Summary of Activity Diagram \" " + currentDiagram.Name + " \" ========>");
			
			var Initial_Node_Present = false;
			var Final_Node_Present = false;
			var Activity_Partition_Present = false;
			var Fork = false;
			var Nb_Input_ConnectorsMap = new Map();
			var Nb_Output_ConnectorsMap = new Map();
			var iterator1;
			var iterator2;
			var InFlowConnector as EA.Connector;
			var OutFlowConnector as EA.Connector;
			var OtherElement as EA.Element;
			var myElementClassifier as EA.Element.ClassifierName;
			
			IgnoreListMap.set("Part");
			
			if ( selectedObjects.Count > 0 )
			{
				//Extract Data
				for (var j = 0; j < selectedObjects.Count; j++)
				{
					selectedElement = Repository.GetElementByID(selectedObjects.GetAt(j).ElementID);
					DiagramElementsMap.set(selectedElement.ElementID, selectedElement.Name);
				}
				
				for (var i = 0; i < selectedObjects.Count; i++)
					{						
						selectedObject = currentDiagram.DiagramObjects.GetAt(i);
						selectedElement = Repository.GetElementByID(selectedObject.ElementID);
						//Session.Output("Diagram Object : " + selectedElement.Name + " Of Type : " + selectedElement.Type +"Present in " + currentDiagram.Name);
						
						switch ( selectedElement.Type )
							{
								//CHK_Activity_Parameters
								case 'ActivityParameter':
									if (selectedElement.ClassfierID == "" && selectedElement.ClassifierType == "")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Activity Parameter : " + selectedElement.Name + " should have Classifier ID");

									}
									else if (selectedElement.ClassfierID != 0)
									{
										myclassifier = Repository.GetElementByID(selectedElement.ClassfierID);
										
										if(myclassifier.Stereotype != "ValueType")
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Activity Parameter : " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier as ValueType");
											
										}
									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Activity Parameter : " + selectedElement.Name + ": " + selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have a name");

									}
									
									//CHK_Flows --> check for Object Flow for an Activity parameters
									if (selectedElement.Connectors.Count > 0)
										{
											for (var s = 0; s < selectedElement.Connectors.Count; s++)
											{
												myconnector = selectedElement.Connectors.GetAt(s);
												
												if (myconnector.Type != "Abstraction")
												{
													if (myconnector.Type != "ObjectFlow")
													{
														findings++;
														Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Activity parameter: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Object Flow Connector");

													}
													else
													{
														OneSideElement = Repository.GetElementByID( myconnector.ClientID);
														OtherSideElement = Repository.GetElementByID( myconnector.SupplierID);
														if ((OneSideElement.ClassfierID != OtherSideElement.ClassfierID) && (OtherSideElement.Type == "ActionPin"))
														{
															if ((!MismatchPairMap.has(myconnector.ClientID)) && (!MismatchPairMap.has(myconnector.SupplierID))) 
															{
																//extra check for synchronised action pins from call behavior actions --> to be checked for activity parameter classifiers
																if ((OtherSideElement.ClassifierType != "ActivityParameter") && (OneSideElement.ClassifierName != OtherSideElement.ClassifierName))
																{
																	findings++;
																	Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Element : " + OneSideElement.Name + " Classifier : " + OneSideElement.ClassifierName + " does not match with Otherside element : " + OtherSideElement.Name + " Classifier : " + OneSideElement.ClassifierName);
																	MismatchPairMap.set(myconnector.ClientID, myconnector.SupplierID);
																}
															}
														}
													}
												}
												
											}
										}
										else
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Activity parameter: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " missing Object Flow Connector");
											
										}
										
										//To find missing elements in diagram
										findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap, true);
									
												
									break;
									
								//Check Action Pin for CHK_Activity_Parameters
								case 'ActionPin':
									
									myParentElement = Repository.GetElementByID(selectedElement.ParentID);
									// Check for empty Classifier ID
									if (selectedElement.ClassfierID == "" && selectedElement.ClassifierType == "")
									{
										
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + " : " + myParentElement.ClassifierName + " should have Classifier ID");
									
									}
									else if (selectedElement.ClassfierID != 0)
									{
										myclassifier = Repository.GetElementByID(selectedElement.ClassfierID);
										
										if ((myclassifier.Stereotype != "ValueType") && (myclassifier.ClassifierType != "DataType") && (myclassifier.Type != "ActivityParameter"))
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Action Pin: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID +  " present in Action block " + myParentElement.Name + " : " + myParentElement.ClassifierName + " should have Classifier as ValueType");
									
										}
									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + " : " + myParentElement.ClassifierName + " should have a name");
									
									}
									
									//CHK_Flows --> check for Object Flow for an Acton Pin
									if (selectedElement.Connectors.Count > 0)
										{
											for(var c = 0; c < selectedElement.Connectors.Count; c++)
											{
												myconnector = selectedElement.Connectors.GetAt(c);
												if (selectedElement.Connectors.GetAt(c).Type != "ObjectFlow")
													{
														findings++;
														Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + ":" + myParentElement.ClassifierName + "connector " + selectedElement.Connectors.GetAt(c).Name + " should have Object Flow Connector");
									
													}
													
												if ((selectedElement.MetaType == "InputPin") && (myconnector.ClientID == selectedElement.ElementID))
													{
														findings++;
														Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + ":" + myParentElement.ClassifierName + " is defined as " + selectedElement.MetaType + ", Either the source of Object Flow Connector or the direction of Action Pin to be changed");
									
													}
											}
										}
										else
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Action Pin : " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + ":" + myParentElement.ClassifierName +" should have a connector" );
									
										}
										
									break;
								
								case 'StateNode':									 
									//Check for Initial Node Presence
									if (selectedElement.Name == "ActivityInitial" || selectedElement.Name == "Start")
									{
										//CHK_Flows --> check for Object Flow for an Nodes									
										if(selectedElement.Connectors.Count > 0)
										{	
											myconnector = selectedElement.Connectors.GetAt(0);
											
											if (myconnector.Type != "ControlFlow")
												{													
													Session.Output("Suggestion ==> CHK_Flows ==> Initial Node: " + selectedElement.Name + " connector " + selectedElement.Connectors.GetAt(0).Name + " should not have any Flow Connector otherthan Control Flow");
												}
											//Check Direction of connector
											tempElement = Repository.GetElementByID(myconnector.ClientID);
											if (tempElement.Name != "ActivityInitial" || selectedElement.Name == "Start")
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Initial Node should be source for connector: " + selectedElement.Name);

											}
												
										}
										Initial_Node_Present = true;
									}
									
									//Check for Final Node Presence
									if (selectedElement.Name == "ActivityFinal" || selectedElement.Name == "Final")
									{
										//CHK_Flows --> check for Object Flow for an Nodes									
										if(selectedElement.Connectors.Count > 0)
										{	
											myconnector = selectedElement.Connectors.GetAt(0);
											
											if (myconnector.Type != "ControlFlow")
												{													
													Session.Output("Suggestion ==> CHK_Flows ==> Final Node: " + selectedElement.Name + " connector " + selectedElement.Connectors.GetAt(0).Name + " should not have any Flow Connector otherthan Control Flow");
												}
											
											tempElement = Repository.GetElementByID(myconnector.ClientID);
											if (tempElement.Name == "ActivityFinal" || selectedElement.Name == "Final")
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Final Node should be Destination for connector: " + selectedElement.Name);

											}
												
										}
										Final_Node_Present = true;
									}
								
									break;
									
								case 'Action':
									//CHK_Types --> All Actions should be of Call Behavior Action type
									if (selectedElement.MetaType != "CallBehaviorAction")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Action: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " does not have CallBehaviorAction set");

									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Action: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have a name");

									}
									
									//CHK_Types --> All Actions should have atleast one connector directly or to its actionpin elements
									if (selectedElement.Connectors.Count > 0)
									{
										var Valid_Connector_Found = true;
										
										for(var c = 0; c < selectedElement.Connectors.Count; c++)
											{
												myconnector = selectedElement.Connectors.GetAt(c);
												if ((myconnector.Type != "ControlFlow") && (myconnector.Type != "Abstraction"))
													{
														Valid_Connector_Found = false;
													}
											}
											
											if (!Valid_Connector_Found)
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Action : "+ selectedElement.Name + ": " + selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have Control Flow connector" );

											}
										
									}
									else
									{
										if (selectedElement.Elements.Count == 0)
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Action : "+ selectedElement.Name + ": " + selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have atleast one element");

										}
										else if (selectedElement.Elements.Count > 0)
										{
											var Connector_Found = false;
											
											for(var c = 0; c < selectedElement.Elements.Count; c++)
											{
												myChildElement = selectedElement.Elements.GetAt(c);
												
												if ((!Connector_Found) && (myChildElement.Connectors.Count > 0))
												{
													Connector_Found = true;
													break;
												}
													
											}
											
											if (!Connector_Found)
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Action : " +selectedElement.Name + ": " + selectedElement.ClassifierName + " does not have a valid connector in Diagram");

											}
											
										}

									}
									
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap, true);
									
									break;
								
								case 'ActivityPartition':
									//CHK_Types --> At least one action present
									if (selectedElement.Elements.Count == 0)
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " does not have any actions associated");

									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have a name");

									}
									
									//CHK_Types --> Activity partition should have classifier ID
									if (selectedElement.ClassfierID == 0)
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier ID");

									}
									else
									{
										myclassifier = Repository.GetElementByID(selectedElement.ClassfierID);
										
										if(myclassifier.Stereotype != "block")
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier as Block");

										}
									}
									
									Activity_Partition_Present = true;
									
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
									
									break;
								case 'Activity':
									
									if (selectedElement.ElementID != currentDiagram.ParentID)
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> activity: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should be an action");

									}
									
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
									
									break;
									
								case 'Synchronization' :
									
									Fork = false;
								    Nb_Input_ConnectorsMap.clear();
								    Nb_Output_ConnectorsMap.clear();
								    var connectortype = "";
								    myElementClassifier = "";

									// Check the connectors and their classifiers								
									if(selectedElement.Connectors.Count > 0)
									{	
										for(var g = 0; g < selectedElement.Connectors.Count; g++)
										{
											myconnector = selectedElement.Connectors.GetAt(g);
											//Output flow
											if (myconnector.ClientID == selectedElement.ElementID)
												{
													Nb_Output_ConnectorsMap.set(myconnector.ConnectorID,myconnector.Type);	
												}
												//Input Flow
												else if(myconnector.SupplierID == selectedElement.ElementID)
												{
													Nb_Input_ConnectorsMap.set(myconnector.ConnectorID,myconnector.Type);	
												}
										}
										
										//Lets iterate the connectorlist map and find out the problems
										if ((Nb_Input_ConnectorsMap.size > 0) && (Nb_Output_ConnectorsMap.size > 0))
										{
											
											if(Nb_Input_ConnectorsMap.size < Nb_Output_ConnectorsMap.size)
											{
												Fork = true;
											}
											
											if (Fork) //Fork should have one input flow and more than one output flow
											{
												
												if (Nb_Input_ConnectorsMap.size > 1)
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Fork: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has more than one In flows");

												}
												else
												{
													iterator1 = Nb_Input_ConnectorsMap.keys();
													var connectorId = iterator1.next().value;
													connectortype = Nb_Input_ConnectorsMap.get(connectorId);
													tempElement = Repository.GetElementByID(Repository.GetConnectorByID(connectorId).ClientID);
													myElementClassifier = tempElement.ClassifierName;
												}

												if (Nb_Output_ConnectorsMap.size < 2)
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Fork: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have more than one Out flows");

												}
												else
												{
													iterator2 = Nb_Output_ConnectorsMap.keys();
													for (var iter =0; iter < Nb_Output_ConnectorsMap.size; iter ++)
													{
														var connectorId = iterator2.next().value;
														OutFlowConnector = Repository.GetConnectorByID(connectorId);
														OtherElement = Repository.GetElementByID(OutFlowConnector.SupplierID);
														if ((connectortype != "") && (connectortype != Nb_Output_ConnectorsMap.get(connectorId)))
														{															
															findings++;
															Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Fork: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has connector out going to : " + OtherElement.Name + " with GUID: " + OtherElement.ElementGUID + " should be " +connectortype);

														}
														
														if ( (myElementClassifier != "") && (myElementClassifier != OtherElement.ClassifierName))
														{
															myParentElement = Find_My_ParentClassifier(OtherElement);
												
															if (myParentElement != null) 
															{
																if(myParentElement.ClassifierName != myElementClassifier)
																{
																	findings++;
																	Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Fork: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has connector out going to : " + OtherElement.Name + " with GUID: " + OtherElement.ElementGUID + " classifier not mathcing with " + myElementClassifier);

																}
															}
	
														}
													}
												}
																							
											}
											else //join should have one Output flow and more than one Input flow
											{						
												if(Nb_Output_ConnectorsMap.size > 1)
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Join: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has more than one Outflows");

												}
												else
												{
													iterator1 = Nb_Output_ConnectorsMap.keys();
													var connectorId = iterator1.next().value;
													connectortype = Nb_Output_ConnectorsMap.get(connectorId);
													tempElement = Repository.GetElementByID(Repository.GetConnectorByID(connectorId).SupplierID);
													myElementClassifier = tempElement.ClassifierName;
												}
												if(Nb_Input_ConnectorsMap.size < 2)
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Join: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have more than one In flows");

												}
												else
												{
													iterator2 = Nb_Input_ConnectorsMap.keys();
													
													for (var iter =0; iter < Nb_Input_ConnectorsMap.size; iter ++)
													{
														var connectorId = iterator2.next().value;
														InFlowConnector = Repository.GetConnectorByID(connectorId);
														OtherElement = Repository.GetElementByID(InFlowConnector.ClientID);
														
														if ((connectortype != "") && (connectortype != Nb_Input_ConnectorsMap.get(connectorId)))
														{
															findings++;
															Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Join: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has connector in coming from : " + OtherElement.Name + " with GUID: " + OtherElement.ElementGUID + " should be " + connectortype);

														}
														
														if ((myElementClassifier != "") && (myElementClassifier != OtherElement.ClassifierName))
														{
															myParentElement = Find_My_ParentClassifier(OtherElement);
															
															if (myParentElement != 0) 
															{
																if (myParentElement.ClassifierName != myElementClassifier)
																{
																	findings++;
																	Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Join: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has connector in coming from : " + OtherElement.Name + " with GUID: " + OtherElement.ElementGUID + " classifier not mathcing with " + myElementClassifier);

																}
															}
															
														}
													}
												}
											}
											
											
										}
										else 
										{
											if(Nb_Input_ConnectorsMap.size == 0)
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Element: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has no In flows");

											}
											if(Nb_Output_ConnectorsMap.size == 0)
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Element: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " has no Out flows");

											}
										}
										
									}
									

									
									break;
									
								default:
									//Session.Output("Name: " + selectedElement.Name + "Other Type: " + selectedElement.Type);
							}
					}
					
					//Summarise Initial & Final Node Presence after looping thru all elements
					if (!Initial_Node_Present)
					{
						Session.Output("CHK_Nodes ==> Suggestion to have inital node.");
					}
					if (!Final_Node_Present)
					{
						Session.Output("CHK_Nodes ==> Suggestion to have final node");
					}
					if (!Activity_Partition_Present)
					{
						findings++;
						Log_Review_Finding(selectedElement, findings+ ". CHK_Nodes ==> Activity Partition not present, at least one should be present");
					}					
			}
		}
		else if(currentDiagram.Type == "Logical") // Block Definition
		{
			Session.Output("<======== Review Summary of Block Definition Diagram \" " + currentDiagram.Name + " \" ========>");
			var Ports_Present = false;
			var Blocks_Present = false;
			var InterfaceBlocks_Present = false;
			IgnoreListMap.set("Part");
			IgnoreListMap.set("Text");
			IgnoreListMap.set("Note");
			//Extract interface blocks
			for (var j = 0; j < selectedObjects.Count; j++)
			{
				selectedElement = Repository.GetElementByID(selectedObjects.GetAt(j).ElementID);
				DiagramElementsMap.set(selectedElement.ElementID, selectedElement.Name);
				if (selectedElement.MetaType == "InterfaceBlock")
					InterfaceBlocks.set(selectedElement.ElementID, selectedElement.Name);
				else if ((selectedElement.MetaType == "Port") && (selectedElement.Stereotype == "ProxyPort"))
					ProxyPorts.set(selectedElement.PropertyType, selectedElement.ElementID);
			}
				
			if ( selectedObjects.Count > 0 )
			{
				for (var i = 0; i < selectedObjects.Count; i++)
					{
						selectedObject = selectedObjects.GetAt(i);
						selectedElement = Repository.GetElementByID(selectedObject.ElementID);
						var currentTimeDate = new Date();
						var myIBElement as EA.Element;
						//Session.Output("=====> Element ID : " + selectedObject.ElementID +" Name : " + selectedElement.Name + " Time : " + currentTimeDate );
						
						switch ( selectedElement.MetaType )
							{
								//CHK_Ports
								case 'Port':
																		
									if (selectedElement.Stereotype != "ProxyPort")
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port : " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " Stereo Type should be of ProxyPort");

									}
									
									//CHK_Types --> Proxy port should have classifier ID
									if (selectedElement.PropertyType == 0)
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier ID");
									}
									else
									{
										myclassifier = Repository.GetElementByID(selectedElement.PropertyType);
										
										if(myclassifier.Stereotype != "InterfaceBlock")
										{
											Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier as Interface Block");
										}
									}
									
									//check for this port in interface blocks
									if(!InterfaceBlocks.has(selectedElement.PropertyType))
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port: " + selectedElement.Name + " with property: " + selectedElement.PropertyTypeName + " Interface Block is missing");
									}
									if (!Ports_Present)
										Ports_Present = true;
									break;
								
								//CHK_Block
								case 'Block':

									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
								    
								   //Look for connectors
									if(selectedElement.Connectors.Count == 0)
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Connectorss ==> Block : " + selectedElement.Name + " with " + selectedElement.PropertyTypeName + " with GUID : " + selectedElement.ElementGUID + " has no connector associated");
									   	}
										else
										{

											var validConnectorFound = false;
											
											for(var c = 0; c < selectedElement.Connectors.Count; c++)
											{					
												myconnector = selectedElement.Connectors.GetAt(c);
												//Session.Output(" CHK_Connectorss ==> Connector : " + myconnector.ConnectorGUID +" source ID: " + myconnector.ClientID +" dest ID: " + myconnector.SupplierID);
												//Session.Output(" CHK_Connectorss ==> Element ID :" +  selectedObjects.GetAt(d).ElementID);
											    
												if ((DiagramElementsMap.has(myconnector.ClientID)) && (DiagramElementsMap.has(myconnector.SupplierID)))
												{
													validConnectorFound = true;
													break;
												}
												
											}
											
											if (!validConnectorFound)
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Connectorss ==> Block : " + selectedElement.Name + " with type: " + selectedElement.PropertyTypeName + " has no connector associated");

												}
										}
										if (!Blocks_Present)
											Blocks_Present = true;
									
									break;
										
								//CHK_InterfaceBlock
								case 'InterfaceBlock':
									
									var myParentElementID = 0;
									var myChildElementID = 0;
								    var Report_Missing_IB_To_ProxyPort = true;
								
									//Session.Output("Name: " + selectedElement.Name + " : " + selectedElement.ClassifierName + "Other Type: " + selectedElement.Type + selectedElement.MetaType + " ID: " + selectedElement.ElementID);
									if(!ProxyPorts.has(selectedElement.ElementID))
									{
										if (DiagramElementsMap.has(selectedElement.ParentID) && ProxyPorts.has(selectedElement.ParentID))
											Report_Missing_IB_To_ProxyPort = false;
										else 
											{
												myChildElementID = Find_My_IBChild(selectedElement);
												
												while(myChildElementID !=0) 
												{
													myChildElement = Repository.GetElementByID(myChildElementID);
													
													if (DiagramElementsMap.has(myChildElementID) && ProxyPorts.has(myChildElementID))
													{
														Report_Missing_IB_To_ProxyPort = false;
														break;
													}
													myChildElementID = Find_My_IBChild(myChildElement);
												}
												
										}
										
									}
									else
									{
										Report_Missing_IB_To_ProxyPort = false;
									}
									
									if (Report_Missing_IB_To_ProxyPort)
									{
										findings++;
										Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Interface Block : " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " Interface Block is not used in any proxy port");
									}
									var myTaggedValue as EA.TaggedValue;
									var myProptypeValue as EA.PropertyType;
									
									// Check all the flow properties should be out
									for(var v = 0; v < selectedElement.Elements.Count; v++)
									{
										myIBElement = selectedElement.Elements.GetAt(v);
										/*for (var g = 0; g < myIBElement.TaggedValues.Count; g++)
										{
											myTaggedValue = myIBElement.TaggedValues.GetAt(g);
											
											Session.Output("TaggedValue Name: " + myTaggedValue.Name+ " Value: " +myTaggedValue.Value);

										}*/
										
										if (myIBElement.MetaType == "FlowProperty") 
										{
											for (var h = 0; h < myIBElement.TypeInfoProperties.Count; h++)
											{
												myProptypeValue = myIBElement.TypeInfoProperties.Items(h);
												if (myProptypeValue.Name == "direction" && myProptypeValue.Value != "out")
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Interface Block: " + selectedElement.Name + " flow property : "+ myIBElement.Name +" with GUID" + myIBElement.ElementGUID +  " should be out");											
												}
											}
										}
											 
										
									}
									if (!InterfaceBlocks_Present)
										InterfaceBlocks_Present = true;										
									break;
								//CHK_Activity
								case 'Activity':

									//Session.Output("Name: " + selectedElement.Name + " : " + selectedElement.ClassifierName + "Other Type: " + selectedElement.Type + selectedElement.MetaType);
									break;
								//CHK_Boundary
								case 'Boundary':

									//Session.Output("Name: " + selectedElement.Name + " : " + selectedElement.ClassifierName + "Other Type: " + selectedElement.Type + selectedElement.MetaType);
									break;
								case 'Package':
									break;
								
								case 'ActivityParameter':
									findings++;
									Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Activity Parameter with name : " + selectedElement.Name + " type : " + selectedElement.ClassifierName + selectedElement.Type + " is not expected in Block Diagram.");
									break;
								default:
									Session.Output("Name: " + selectedElement.Name + " : " + selectedElement.ClassifierName + "Other Type: " + selectedElement.Type + selectedElement.MetaType);
							}
					}
					
					//Summarise Initial & Final Node Presence after looping thru all elements
					if (!Ports_Present)
					{
						findings++;
						Log_Review_Finding(selectedElement, findings+ ". CHK_Nodes ==> Ports not present, at least one should be present");
					}
					if (!Blocks_Present)
					{
						findings++;
						Log_Review_Finding(selectedElement, findings+ ". CHK_Nodes ==> Blocks not present, at least one should be present");
					}
					if (!InterfaceBlocks_Present)
					{
						findings++;
						Log_Review_Finding(selectedElement, findings+ ". CHK_Nodes ==> Interface Block not present, at least one should be present");
					}
					
			}
			
		}
		else if(currentDiagram.Type == "CompositeStructure") // Internal Block
		{
			Session.Output("<======== Review Summary of Internal Block Diagram \" " + currentDiagram.Name + " \" ========>");
			IgnoreListMap.set("Activity");
			IgnoreListMap.set("Text");
			IgnoreListMap.set("Note");
			var myOtherElement as EA.Element;
			var badTypeProxyPortsMap = new Map();
			
			//Extract data
			for (var j = 0; j < selectedObjects.Count; j++)
			{
				selectedElement = Repository.GetElementByID(selectedObjects.GetAt(j).ElementID);
				DiagramElementsMap.set(selectedElement.ElementID, selectedElement.Name);
/*				if (selectedElement.MetaType == "Part")
					InterfaceBlocks.set(selectedElement.ElementID, selectedElement.Name);
				else if ((selectedElement.MetaType == "Port") && (selectedElement.Stereotype == "ProxyPort"))
					ProxyPorts.set(selectedElement.PropertyType, selectedElement.ElementID);*/

			}
			
			if ( selectedObjects.Count > 0 )
			{
				for (var i = 0; i < selectedObjects.Count; i++)
					{
						selectedObject = selectedObjects.GetAt(i);
						selectedElement = Repository.GetElementByID(selectedObject.ElementID);
						
						let currentTimeDate = new Date();
						Session.Output("=====> Element ID : " + selectedElement.ElementID +" Name : " + selectedElement.Name + " Time : " + currentTimeDate );

						
						switch ( selectedElement.MetaType )
							{
								case 'Part' :
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
								
									//Check each Prxoy port connector(at least one) presence and Type match with outer port
									for (var j = 0; j < selectedElement.Elements.Count; j++)
									{
										myChildElement = selectedElement.Elements.GetAt(j);
										if ((myChildElement.Type == "Port") && (myChildElement.Connectors.Count == 0))
										{
											findings++;
											Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Port : " + myChildElement.Name + " : " + myChildElement.PropertyTypeName + " with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no connector");
										}
										else
										{
											var noTypeAssociated = false;
											
											for(var c = 0; c < myChildElement.Connectors.Count; c++)
												{					
													myconnector = myChildElement.Connectors.GetAt(c);
													
													if (myconnector.ClientID == myChildElement.ElementID)
														myOtherElement = Repository.GetElementByID(myconnector.SupplierID);
													else
														myOtherElement = Repository.GetElementByID(myconnector.ClientID);
													if (myChildElement.PropertyType == 0)
													{
														if (!noTypeAssociated)
														{
															noTypeAssociated = true;
															findings++;
															Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port : " + myChildElement.Name + " with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no Type Associated");
														}
													}
													else if ((myChildElement.PropertyType != myOtherElement.PropertyType) && !Check_BadType_Proxy_Present(badTypeProxyPortsMap, myChildElement.ElementID, myOtherElement.ElementID))
													{
														findings++;
														Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port : " + myChildElement.Name + " : " + myChildElement.PropertyTypeName + " with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " Type does not match with Port : " + myOtherElement.Name + " : " + myOtherElement.PropertyTypeName);
														badTypeProxyPortsMap.set(myChildElement.ElementID, myOtherElement.ElementID)
													}
												}
										}
											
									}
									
									break;
								
								case 'Block' :
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
								
									// Check Ports present in block
									for (var k = 0; k < selectedElement.Elements.Count; k++)
									{
										myChildElement = selectedElement.Elements.GetAt(k);
										if ((myChildElement.Type == "Port") && DiagramElementsMap.has(myChildElement.ElementID))
										{
											//Check each Prxoy port connector(at least one) presence
											if (myChildElement.Connectors.Count == 0)
											{
												findings++;
												Log_Review_Finding(selectedElement, findings+ ". CHK_Flows ==> Port :" + myChildElement.Name + " : " + myChildElement.PropertyTypeName + "with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no connector");
											}
											
											//Check each Prxoy port type existence											
											if (myChildElement.PropertyType == 0)
												{
													findings++;
													Log_Review_Finding(selectedElement, findings+ ". CHK_Types ==> Port : " + myChildElement.Name + " with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no Type Associated");
												}
										}
									}
								
									break;
								
								case 'Port' : 
									// ports are already processed at block and part level individually so nothing to do here...
									break;
								default :
									//Session.Output("Name: " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " Type: " + selectedElement.MetaType + " ID: " + selectedElement.ElementID + " Connectors: " + selectedElement.Connectors.Count + " GUID: " + selectedElement.ElementGUID + " SubElements: " + selectedElement.Elements.Count);
							}
					}
			}
		}
		
		//CSVEExportFinalize();
		if (findings == 0)
		{
			Remove_Review_Package();
			Session.Output("<======== No Findings, Good Work!!! ========>");
		}
			
		else
		{
			Add_Summary_To_Review_Package(currentDiagram);
			Session.Output("<======== Total Findings = " + findings + " ========>");
		}
		
		//Release User lock applied before
		var ReviewPackage as EA.Package;
		ReviewPackage = Repository.GetPackageByGuid(Review_Package_Location_GUID);
		ReviewPackage.ReleaseUserLockRecursive(true, false, false);
	}
	else
	{
		Session.Prompt( "This script requires a diagram to be visible.", promptOK)
	}
	Session.Output("<======== Executing Diagram_Review_Script_V2 Completed========>");
}

OnDiagramScript();