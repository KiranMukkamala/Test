!INC Local Scripts.EAConstants-JScript

/*
 * This code has been included from the default Diagram Script template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.
 *
 * Script Name: Diagram_Review_Script
 * Author: Mukkamala Kiran (review checks provided by Matthias Farian)
 * Purpose: To Check basic intergity and pre review checks for authors and reviewers of EA models
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
										Session.Output(findings + ". CHK_Void ==> " + myChildElement.Type + " : "+ myChildElement.Name + ": " + myChildElement.ClassifierName + " with GUID: " + myChildElement.ElementGUID + " associated to " + Ele.Stereotype + " :" + Ele.Name + ": " + Ele.ClassifierName + " missing in current Diagram");
									}
								}
						}
						else
						{	
							findings++;
							Session.Output(findings + ". CHK_Void ==> " + myChildElement.Type + " : "+ myChildElement.Name + ": " + myChildElement.ClassifierName + " with GUID: " + myChildElement.ElementGUID + " associated to " + Ele.Stereotype + " :" + Ele.Name + ": " + Ele.ClassifierName + " missing in current Diagram");
						}
							
					}
			
			}
		
	}
	
	return findings;
}

/*
 * Diagram Script main function
 */
function OnDiagramScript()
{
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

		var IgnoreListMap = new Map();
		
		if (currentDiagram.Type == "Activity")
		{
			Session.Output("<======== Review Summary of Activity Diagram \" " + currentDiagram.Name + " \" ========>");
			
			var Initial_Node_Present = false;
			var Final_Node_Present = false;
			var Activity_Partition_Present = false;
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
										Session.Output(findings + ". CHK_Types ==> Activity Parameter : " + selectedElement.Name + " should have Classifier ID");

									}
									else if (selectedElement.ClassfierID != 0)
									{
										myclassifier = Repository.GetElementByID(selectedElement.ClassfierID);
										
										if(myclassifier.Stereotype != "ValueType")
										{
											findings++;
											Session.Output(findings + ". CHK_Types ==> Activity Parameter : " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier as ValueType");
										}
									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> Activity Parameter : " + selectedElement.Name + ": " + selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have a name");
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
														Session.Output(findings + ". CHK_Flows ==> Activity parameter: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Object Flow Connector");
													}
													else
													{
														OneSideElement = Repository.GetElementByID( myconnector.ClientID);
														OtherSideElement = Repository.GetElementByID( myconnector.SupplierID);
														if ((OneSideElement.ClassfierID != OtherSideElement.ClassfierID) && (OtherSideElement.Type == "ActionPin"))
														{
															if ((!MismatchPairMap.has(myconnector.ClientID)) && (!MismatchPairMap.has(myconnector.SupplierID))) 
															{
																//extra check for synchronised action pins from call behavior actions
																if ((OtherSideElement.ClassifierType != "ActivityParameter") && (OneSideElement.ClassifierName != OtherSideElement.ClassifierName))
																{
																	findings++;
																	Session.Output(findings + ". CHK_Flows ==> Element : " + OneSideElement.Name + " Classifier : " + OneSideElement.ClassifierName + " does not match with Otherside element : " + OtherSideElement.Name + " Classifier : " + OneSideElement.ClassifierName);
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
											Session.Output(findings + ". CHK_Flows ==> Activity parameter: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " missing Object Flow Connector");
										}
												
									break;
									
								//Check Action Pin for CHK_Activity_Parameters
								case 'ActionPin':
									
									myParentElement = Repository.GetElementByID(selectedElement.ParentID);
									// Check for empty Classifier ID
									if (selectedElement.ClassfierID == "" && selectedElement.ClassifierType == "")
									{
										
										findings++;
										Session.Output(findings + ". CHK_Types ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + " : " + myParentElement.ClassifierName + " should have Classifier ID");
									
									}
									else if (selectedElement.ClassfierID != 0)
									{
										myclassifier = Repository.GetElementByID(selectedElement.ClassfierID);
										
										if ((myclassifier.Stereotype != "ValueType") && (myclassifier.ClassifierType != "DataType") && (myclassifier.Type != "ActivityParameter"))
										{
											findings++;
											Session.Output(findings + ". CHK_Types ==> Action Pin: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID +  " present in Action block " + myParentElement.Name + " : " + myParentElement.ClassifierName + " should have Classifier as ValueType");
										}
									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + " : " + myParentElement.ClassifierName + " should have a name");
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
														Session.Output(findings + ". CHK_Flows ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + ":" + myParentElement.ClassifierName + "connector " + selectedElement.Connectors.GetAt(c).Name + " should have Object Flow Connector");
													}
													
												if ((selectedElement.MetaType == "InputPin") && (myconnector.ClientID == selectedElement.ElementID))
													{
														findings++;
														Session.Output(findings + ". CHK_Flows ==> Action Pin: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + ":" + myParentElement.ClassifierName + " is defined as " + selectedElement.MetaType + ", Either the source of Object Flow Connector or the direction of Action Pin to be changed");
													}
											}
										}
										else
										{
											findings++;
											Session.Output(findings + ". CHK_Flows ==> Action Pin : " + selectedElement.Name + ": " +selectedElement.ClassifierName + " present in Action block " + myParentElement.Name + ":" + myParentElement.ClassifierName +" should have a connector" );
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
													Session.Output(findings + ". CHK_Flows ==> Initial Node: " + selectedElement.Name + " connector " + selectedElement.Connectors.GetAt(0).Name + " should not have any Flow Connector otherthan Control Flow");
												}
											//Check Direction of connector
											tempElement = Repository.GetElementByID(myconnector.ClientID);
											if (tempElement.Name != "ActivityInitial" || selectedElement.Name == "Start")
											{
												findings++;
												Session.Output(findings + ". CHK_Flows ==> Initial Node should be source for connector: " + selectedElement.Name);

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
													Session.Output(findings + ". CHK_Flows ==> Final Node: " + selectedElement.Name + " connector " + selectedElement.Connectors.GetAt(0).Name + " should not have any Flow Connector otherthan Control Flow");
												}
											
											tempElement = Repository.GetElementByID(myconnector.ClientID);
											if (tempElement.Name == "ActivityFinal" || selectedElement.Name == "Final")
											{
												findings++;
												Session.Output(findings + ". CHK_Flows ==> Final Node should be Destination for connector: " + selectedElement.Name);
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
										Session.Output(findings + ". CHK_Types ==> Action: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " does not have CallBehaviorAction set");
									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> Action: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have a name");
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
												Session.Output(findings + ". CHK_Flows ==> Action : "+ selectedElement.Name + ": " + selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have Control Flow connector" );
											}
										
									}
									else
									{
										if (selectedElement.Elements.Count == 0)
										{
											findings++;
											Session.Output(findings + ". CHK_Flows ==> Action : "+ selectedElement.Name + ": " + selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have atleast one element");
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
												Session.Output(findings + ". CHK_Flows ==> Action : " +selectedElement.Name + ": " + selectedElement.ClassifierName + " does not have a valid connector in Diagram");
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
										Session.Output(findings + ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " does not have any actions associated");
									}
									
									// Check for empty name
									if (selectedElement.Name == "")
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + ": " +selectedElement.ClassifierName + " with GUID : " + selectedElement.ElementGUID + " should have a name");
									}
									
									//CHK_Types --> Activity partition should have classifier ID
									if (selectedElement.ClassfierID == 0)
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier ID");
									}
									else
									{
										myclassifier = Repository.GetElementByID(selectedElement.ClassfierID);
										
										if(myclassifier.Stereotype != "block")
										{
											findings++;
											Session.Output(findings + ". CHK_Types ==> ActivityPartition: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier as Block");
										}
									}
									
									Activity_Partition_Present = true;
									
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
									
									break;
								case 'Activity':
									
									//To find missing elements in diagram
									findings = Check_Presence_In_Diagram(selectedElement, DiagramElementsMap, findings, IgnoreListMap);
									
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
						Session.Output(findings + ". CHK_Nodes ==> Activity Partition not present, at least one should be present");
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
										Session.Output(findings + ". CHK_Types ==> Port : " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " Stereo Type should be of ProxyPort");

									}
									
									//CHK_Types --> Proxy port should have classifier ID
									if (selectedElement.PropertyType == 0)
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> Port: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier ID");
									}
									else
									{
										myclassifier = Repository.GetElementByID(selectedElement.PropertyType);
										
										if(myclassifier.Stereotype != "InterfaceBlock")
										{
											Session.Output(findings + ". CHK_Types ==> Port: " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " should have Classifier as Interface Block");
										}
									}
									
									//check for this port in interface blocks
									if(!InterfaceBlocks.has(selectedElement.PropertyType))
									{
										findings++;
										Session.Output(findings + ". CHK_Types ==> Port: " + selectedElement.Name + " with property: " + selectedElement.PropertyTypeName + " Interface Block is missing");
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
											Session.Output(findings + ". CHK_Connectorss ==> Block : " + selectedElement.Name + " with " + selectedElement.PropertyTypeName + " with GUID : " + selectedElement.ElementGUID + " has no connector associated");
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
													Session.Output(findings + ". CHK_Connectorss ==> Block : " + selectedElement.Name + " with type: " + selectedElement.PropertyTypeName + " has no connector associated");

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
										Session.Output(findings + ". CHK_Types ==> Interface Block : " + selectedElement.Name + " with GUID : " + selectedElement.ElementGUID + " Interface Block is not used in any proxy port");
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
											
											Session.Output(myTaggedValue.Name);
											Session.Output(myTaggedValue.Value);
										}*/
										
										if (myIBElement.MetaType == "FlowProperty") 
										{
											for (var h = 0; h < myIBElement.TypeInfoProperties.Count; h++)
											{
												myProptypeValue = myIBElement.TypeInfoProperties.Items(h);
												if (myProptypeValue.Name == "direction" && myProptypeValue.Value != "out")
												{
													findings++;
													Session.Output(findings + ". CHK_Types ==> Interface Block: " + selectedElement.Name + " flow property : "+ myIBElement.Name +" with GUID" + myIBElement.ElementGUID +  " should be out");											
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
									Session.Output(findings + ". CHK_Types ==> Activity Parameter with name : " + selectedElement.Name + " type : " + selectedElement.ClassifierName + selectedElement.Type + " is not expected in Block Diagram.");
									break;
								default:
									Session.Output("Name: " + selectedElement.Name + " : " + selectedElement.ClassifierName + "Other Type: " + selectedElement.Type + selectedElement.MetaType);
							}
					}
					
					//Summarise Initial & Final Node Presence after looping thru all elements
					if (!Ports_Present)
					{
						findings++;
						Session.Output(findings + ". CHK_Nodes ==> Ports not present, at least one should be present");
					}
					if (!Blocks_Present)
					{
						findings++;
						Session.Output(findings + ". CHK_Nodes ==> Blocks not present, at least one should be present");
					}
					if (!InterfaceBlocks_Present)
					{
						findings++;
						Session.Output(findings + ". CHK_Nodes ==> Interface Block not present, at least one should be present");
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
			}
			
			if ( selectedObjects.Count > 0 )
			{
				for (var i = 0; i < selectedObjects.Count; i++)
					{
						selectedObject = selectedObjects.GetAt(i);
						selectedElement = Repository.GetElementByID(selectedObject.ElementID);
						
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
											Session.Output(findings + ". CHK_Flows ==> Port : " + myChildElement.Name + " : " + myChildElement.PropertyTypeName + " with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no connector");
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
															Session.Output(findings + ". CHK_Types ==> Port: " + myChildElement.Name + " with GUID : " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no Type Associated");
														}
													}
													else if ((myChildElement.PropertyType != myOtherElement.PropertyType) && !Check_BadType_Proxy_Present(badTypeProxyPortsMap, myChildElement.ElementID, myOtherElement.ElementID))
													{
														findings++;
														Session.Output(findings + ". CHK_Types ==> Port: " + myChildElement.Name + " : " + myChildElement.PropertyTypeName + " with GUID : " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " Type does not match with Port : " + myOtherElement.Name + " : " + myOtherElement.PropertyTypeName);
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
												Session.Output(findings + ". CHK_Flows ==> Port:" + myChildElement.Name + " : " + myChildElement.PropertyTypeName + "with GUID : " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no connector");
											}
											
											//Check each Prxoy port type existence											
											if (myChildElement.PropertyType == 0)
												{
													findings++;
													Session.Output(findings + ". CHK_Types ==> Port: " + myChildElement.Name + " with GUID: " + myChildElement.ElementGUID + " present in block : " + selectedElement.Name + " : " + selectedElement.PropertyTypeName + " has no Type Associated");
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
		
		
		if (findings == 0)
			Session.Output("<======== No Findings, Good Work!!! ========>");
		else
			Session.Output("<======== Total Findings = " + findings + " ========>");
	}
	else
	{
		Session.Prompt( "This script requires a diagram to be visible.", promptOK)
	}
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

OnDiagramScript();

